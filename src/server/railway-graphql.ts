const railwayGraphqlEndpoint = process.env.RAILWAY_GRAPHQL_ENDPOINT ?? "https://backboard.railway.com/graphql/v2";

export async function fetchRailwayGraphQL(token: string, query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(railwayGraphqlEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) {
    throw new Error(`Railway GraphQL request failed: ${res.statusText}`);
  }

  const body = await res.json() as { data?: unknown; errors?: Array<{ message?: string }> };
  if (body.errors && body.errors.length > 0) {
    throw new Error(body.errors[0]?.message ?? "Railway GraphQL request failed");
  }

  return body.data as any;
}
