import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encryptGmailTokens, isEncryptionConfigured } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify internal secret for security (this should only be called by admins)
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = Deno.env.get('INTERNAL_CRON_SECRET');
    
    if (!internalSecret || internalSecret !== expectedSecret) {
      console.log('Unauthorized migration attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if encryption is configured
    if (!isEncryptionConfigured()) {
      return new Response(
        JSON.stringify({ 
          error: 'Encryption not configured',
          message: 'GMAIL_TOKEN_ENCRYPTION_KEY secret must be set before migration'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service client for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Starting Gmail token migration...');

    // Fetch all gmail_config records that have plaintext tokens but no encrypted tokens
    const { data: configs, error: fetchError } = await supabase
      .from('gmail_config')
      .select('id, user_id, access_token, refresh_token, access_token_enc, token_nonce')
      .not('access_token', 'is', null);

    if (fetchError) {
      console.error('Failed to fetch gmail configs:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch configs', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: MigrationResult = {
      total: configs?.length || 0,
      migrated: 0,
      skipped: 0,
      errors: [],
    };

    console.log(`Found ${result.total} gmail_config records to process`);

    // Process each config
    for (const config of configs || []) {
      try {
        // Skip if already encrypted
        if (config.access_token_enc && config.token_nonce) {
          console.log(`Skipping config ${config.id} - already encrypted`);
          result.skipped++;
          continue;
        }

        // Skip if no plaintext token
        if (!config.access_token) {
          console.log(`Skipping config ${config.id} - no plaintext token`);
          result.skipped++;
          continue;
        }

        console.log(`Encrypting tokens for config ${config.id}...`);

        // Encrypt the tokens
        const encrypted = await encryptGmailTokens(
          config.access_token,
          config.refresh_token
        );

        // Update the record with encrypted tokens
        const { error: updateError } = await supabase
          .from('gmail_config')
          .update({
            access_token_enc: encrypted.accessTokenEnc,
            refresh_token_enc: encrypted.refreshTokenEnc,
            token_nonce: encrypted.nonce,
            token_key_version: encrypted.keyVersion,
            // Clear plaintext tokens after encryption
            access_token: null,
            refresh_token: null,
          })
          .eq('id', config.id);

        if (updateError) {
          console.error(`Failed to update config ${config.id}:`, updateError);
          result.errors.push(`Config ${config.id}: ${updateError.message}`);
          continue;
        }

        console.log(`Successfully migrated config ${config.id}`);
        result.migrated++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing config ${config.id}:`, errorMessage);
        result.errors.push(`Config ${config.id}: ${errorMessage}`);
      }
    }

    console.log('Migration complete:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migration complete. Migrated ${result.migrated} of ${result.total} records.`,
        result,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Migration failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
