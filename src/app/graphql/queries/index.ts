import { gql } from '@quenetiq/core';

export const GET_CURRENT_USER = gql`
	query GetCurrentUser {
		getCurrentUser {
			id
			username
			createdAt
			updatedAt
		}
	}
`;

export const GET_NOTES = gql`
	query GetNotes($filter: NoteType) {
		getNotes(filter: $filter) {
			id
			title
			content
			description
			iconUrl
			noteType
			createdAt
			updatedAt
		}
	}
`;

export const GET_NOTE_DETAILS = gql`
	query GetNoteDetails($id: String!) {
		getNoteDetails(id: $id) {
			id
			title
			content
			description
			iconUrl
			noteType
			createdAt
			updatedAt
			author {
				id
				username
			}
		}
	}
`;
