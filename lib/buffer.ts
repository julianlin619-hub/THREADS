const BUFFER_GRAPHQL_URL = 'https://api.buffer.com/graphql';

const CREATE_POST_MUTATION = `
  mutation CreatePost($channelId: ChannelId!, $text: String!) {
    createPost(input: {
      channelId: $channelId
      text: $text
      schedulingType: automatic
      mode: addToQueue
    }) {
      ... on PostActionSuccess {
        post {
          id
          status
        }
      }
      ... on InvalidInputError { message }
      ... on UnexpectedError { message }
      ... on LimitReachedError { message }
    }
  }
`;

export async function postToBuffer(text: string): Promise<void> {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  const channelId = process.env.BUFFER_THREADS_CHANNEL_ID;

  if (!token || !channelId) {
    throw new Error('BUFFER_ACCESS_TOKEN and BUFFER_THREADS_CHANNEL_ID must be set in .env.local');
  }

  const res = await fetch(BUFFER_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: CREATE_POST_MUTATION,
      variables: { channelId, text },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Buffer API error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as {
    data?: { createPost?: { post?: { id: string; status: string }; message?: string } };
    errors?: { message: string }[];
  };

  if (data.errors?.length) {
    throw new Error(`Buffer GraphQL error: ${data.errors.map((e) => e.message).join(', ')}`);
  }

  const result = data.data?.createPost;
  if (result?.message) {
    throw new Error(`Buffer error: ${result.message}`);
  }

}
