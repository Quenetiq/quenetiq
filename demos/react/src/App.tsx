import { gql, useQuery } from '@quenetiq/react';

const GET_NOTES = gql`
  query {
    getNotes {
      id
      title
      content
    }
  }
`;

export function App() {
  const { data, loading, error } = useQuery(GET_NOTES);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Quenetiq + React</h1>
      <ul>
        {data?.getNotes?.map((note: { id: string; title: string; content: string }) => (
          <li key={note.id}><strong>{note.title}</strong>: {note.content}</li>
        ))}
      </ul>
    </div>
  );
}
