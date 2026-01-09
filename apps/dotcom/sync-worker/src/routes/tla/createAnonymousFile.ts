import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'

/**
 * Create an anonymous file that doesn't require authentication.
 * The client provides the file ID (which is their anonymous user ID).
 * The file is created with shared=true so anonymous users can access it.
 */
export async function createAnonymousFile(
	request: IRequest,
	env: Environment
): Promise<Response> {
	try {
		const body = (await request.json()) as { fileId?: string }
		const { fileId } = body

		if (!fileId || typeof fileId !== 'string' || fileId.length < 10) {
			return Response.json(
				{ error: true, message: 'Invalid fileId: must be a string with at least 10 characters' },
				{ status: 400 }
			)
		}

		const db = createPostgresConnectionPool(env, 'createAnonymousFile')

		try {
			// Check if file already exists
			const existing = await db.selectFrom('file').where('id', '=', fileId).selectAll().executeTakeFirst()

			if (existing) {
				// File already exists, just return success
				return Response.json({ success: true, fileId, existed: true })
			}

			const now = Date.now()

			// Ensure the anonymous group exists (self-healing)
			// This satisfies the file_owner_xor_check constraint which requires
			// exactly one of ownerId or owningGroupId to be non-null
			await db
				.insertInto('group')
				.values({
					id: 'anonymous_group',
					name: 'Anonymous Users',
					isDeleted: false,
					createdAt: now,
					updatedAt: now,
				})
				.onConflict((oc) => oc.column('id').doNothing())
				.execute()

			// Create new file record with all required fields
			await db
				.insertInto('file')
				.values({
					id: fileId,
					name: 'Learning Session',
					ownerId: null, // No owner for anonymous files
					owningGroupId: 'anonymous_group', // Use anonymous group to satisfy file_owner_xor_check constraint
					ownerName: 'Anonymous',
					ownerAvatar: '',
					thumbnail: '',
					shared: true, // Must be true for anonymous access
					sharedLinkType: 'edit', // Allow editing
					published: false,
					lastPublished: 0,
					publishedSlug: fileId, // publishedSlug must be unique and not null, so use fileId
					createdAt: now,
					updatedAt: now,
					isEmpty: true,
					isDeleted: false,
					createSource: null,
				})
				.execute()

			return Response.json({ success: true, fileId, existed: false })
		} finally {
			await db.destroy()
		}
	} catch (error) {
		console.error('Failed to create anonymous file:', error)
		return Response.json(
			{ error: true, message: 'Failed to create file' },
			{ status: 500 }
		)
	}
}
