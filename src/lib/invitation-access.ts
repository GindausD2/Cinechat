export function validInvitationGrant(invitation: { revoked: boolean; expiresAt: Date } | null, now = Date.now()) {
  return Boolean(invitation && !invitation.revoked && invitation.expiresAt.getTime() > now);
}
