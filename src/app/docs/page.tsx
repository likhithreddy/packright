'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSpec() {
      try {
        setLoading(true);
        const response = await fetch('/api/openapi/spec');

        if (!response.ok) {
          throw new Error(`Failed to load spec: ${response.statusText}`);
        }

        // Verify the spec is accessible
        await response.text();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadSpec();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-amber-600 mx-auto" />
          <p className="text-stone-600">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-4 text-red-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-stone-800">
            Failed to Load API Documentation
          </h2>
          <p className="text-stone-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-stone-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-2xl font-semibold text-stone-800">
            PackRight API Documentation
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Interactive API explorer for the PackRight collaborative trip packing application
          </p>
        </div>
      </div>
      <SwaggerUI
        url="/api/openapi/spec"
        docExpansion="list"
        defaultModelsExpandDepth={1}
        defaultModelExpandDepth={1}
        deepLinking
        filter
        tryItOutEnabled
        persistAuthorization
      />
    </>
  );
}
