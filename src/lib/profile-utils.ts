/**
 * Extracts the initials from a full name.
 * @param name The full name of the user.
 * @returns A 1-2 character string of initials.
 */
export function getInitials(name: string | null | undefined): string {
    if (!name || typeof name !== 'string') return '?';

    const trimmedName = name.trim();
    if (!trimmedName) return '?';

    const parts = trimmedName.split(/\s+/).filter(Boolean);

    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();

    const firstInitial = parts[0][0];
    const lastInitial = parts[parts.length - 1][0];

    return (firstInitial + lastInitial).toUpperCase();
}
