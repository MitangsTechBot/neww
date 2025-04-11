import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { JSZip } from 'npm:jszip@3.10.1';
import { Octokit } from 'npm:@octokit/rest@20.0.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const repoName = formData.get('repoName') as string;
    const token = formData.get('token') as string;

    if (!file || !repoName || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read and extract ZIP file
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const contents = await zip.loadAsync(arrayBuffer);

    // Initialize GitHub client
    const octokit = new Octokit({ auth: token });

    // Create repository
    try {
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        auto_init: true,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to create repository. It might already exist or token lacks permissions.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload files
    for (const [path, file] of Object.entries(contents.files)) {
      if (!file.dir) {
        const content = await file.async('base64');
        
        try {
          await octokit.repos.createOrUpdateFileContents({
            owner: (await octokit.users.getAuthenticated()).data.login,
            repo: repoName,
            path: path,
            message: `Add ${path}`,
            content: content,
          });
        } catch (error) {
          console.error(`Failed to upload ${path}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: 'Files uploaded successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});