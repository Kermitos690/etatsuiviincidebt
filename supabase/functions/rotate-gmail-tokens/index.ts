import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  rotateTokenEncryption,
  getCurrentKeyVersion,
  isNewKeyConfigured,
} from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify internal secret for cron/admin calls
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = Deno.env.get('INTERNAL_CRON_SECRET');
    
    if (!internalSecret || internalSecret !== expectedSecret) {
      console.error('Unauthorized: Invalid internal secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if new key is configured
    if (!isNewKeyConfigured()) {
      console.log('No new encryption key configured. Rotation not needed.');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No new key configured. Set GMAIL_TOKEN_ENCRYPTION_KEY_V2 to enable rotation.',
          rotated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentVersion = getCurrentKeyVersion();
    console.log(`Current key version: ${currentVersion}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all configs with encrypted tokens on older key versions
    const { data: configs, error: fetchError } = await supabase
      .from('gmail_config')
      .select('id, user_email, access_token_enc, refresh_token_enc, token_nonce, token_key_version')
      .not('access_token_enc', 'is', null)
      .lt('token_key_version', currentVersion);

    if (fetchError) {
      console.error('Error fetching configs:', fetchError);
      throw fetchError;
    }

    if (!configs || configs.length === 0) {
      console.log('No tokens need rotation');
      return new Response(
        JSON.stringify({ success: true, message: 'All tokens are on the latest key version', rotated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${configs.length} configs needing rotation`);

    let rotated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const config of configs) {
      try {
        if (!config.access_token_enc || !config.token_nonce) {
          console.log(`Skipping ${config.user_email}: missing encrypted tokens`);
          continue;
        }

        const oldVersion = config.token_key_version || 1;
        console.log(`Rotating tokens for ${config.user_email} from v${oldVersion} to v${currentVersion}`);

        const rotatedTokens = await rotateTokenEncryption(
          config.access_token_enc,
          config.refresh_token_enc,
          config.token_nonce,
          oldVersion
        );

        if (!rotatedTokens) {
          console.log(`Skipping ${config.user_email}: already on latest version`);
          continue;
        }

        // Update with new encrypted tokens
        const { error: updateError } = await supabase
          .from('gmail_config')
          .update({
            access_token_enc: rotatedTokens.accessTokenEnc,
            refresh_token_enc: rotatedTokens.refreshTokenEnc,
            token_nonce: rotatedTokens.nonce,
            token_key_version: rotatedTokens.keyVersion,
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id);

        if (updateError) {
          console.error(`Failed to update ${config.user_email}:`, updateError);
          errors.push(`${config.user_email}: ${updateError.message}`);
          failed++;
        } else {
          console.log(`Successfully rotated tokens for ${config.user_email}`);
          rotated++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`Error rotating ${config.user_email}:`, err);
        errors.push(`${config.user_email}: ${errorMsg}`);
        failed++;
      }
    }

    const result = {
      success: failed === 0,
      message: `Rotation complete: ${rotated} rotated, ${failed} failed`,
      rotated,
      failed,
      currentKeyVersion: currentVersion,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Rotation result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Token rotation error:', err);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});