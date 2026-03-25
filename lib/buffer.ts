const BUFFER_GRAPHQL_URL = 'https://api.buffer.com/graphql';

const CREATE_IDEA_MUTATION = `
  mutation CreateIdea($organizationId: String!, $title: String!, $text: String!) {
    createIdea(input: {
      organizationId: $organizationId
      content: {
        title: $title
        text: $text
      }
    }) {
      ... on Idea {
        id
        content {
          title
          text
        }
      }
    }
  }
`;

export async function postToBuffer(text: string): Promise<{ id: string; status: string }> {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  const organizationId = process.env.BUFFER_ORGANIZATION_ID;

  if (!token || !organizationId) {
    throw new Error('BUFFER_ACCESS_TOKEN and BUFFER_ORGANIZATION_ID must be set in .env.local');
  }

  // Use the first line (or first 100 chars) as the idea title
  const firstLine = text.split('\n')[0];
  const title = firstLine.length > 100 ? firstLine.slice(0, 97) + '…' : firstLine;

  const res = await fetch(BUFFER_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: CREATE_IDEA_MUTATION,
      variables: { organizationId, title, text },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Buffer API error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as {
    data?: { createIdea?: { id: string } };
    errors?: { message: string }[];
  };

  if (data.errors?.length) {
    throw new Error(`Buffer GraphQL error: ${data.errors.map((e) => e.message).join(', ')}`);
  }

  const id = data.data?.createIdea?.id ?? 'unknown';
  return { id, status: 'created' };
}
