<script setup lang="ts">
import { useQuery, gql } from '@quenetiq/vue';

interface Note {
  id: string;
  title: string;
  content: string;
}

const GET_NOTES = gql`
  query {
    getNotes {
      id
      title
      content
    }
  }
`;

const { data, loading, error } = useQuery<{ getNotes: Note[] }>(GET_NOTES);
</script>

<template>
  <h1>DumbQL + Vue</h1>
  <p v-if="loading">Loading...</p>
  <p v-else-if="error">{{ error }}</p>
  <ul v-else>
    <li v-for="note in data?.getNotes" :key="note.id">
      <strong>{{ note.title }}</strong>: {{ note.content }}
    </li>
  </ul>
</template>

<style>
body { font-family: sans-serif; padding: 2rem; }
</style>
