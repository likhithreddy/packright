import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * GET /api/openapi
 * Returns the OpenAPI 3.0 specification for the PackRight API
 */
export async function GET() {
  try {
    // Read the OpenAPI spec from the docs directory
    const specPath = join(process.cwd(), 'docs', 'openapi.yaml');
    const specContent = await readFile(specPath, 'utf-8');

    return new NextResponse(specContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/yaml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error reading OpenAPI spec:', error);
    return NextResponse.json(
      {
        error: 'Failed to load API specification',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
