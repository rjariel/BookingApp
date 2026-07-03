'use client';

export default function DeleteRoleButton({
  action,
  roleId,
  roleName,
  userCount,
}: {
  action: (formData: FormData) => void;
  roleId: string;
  roleName: string;
  userCount: number;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const msg =
          userCount > 0
            ? `Delete "${roleName}"? ${userCount} user(s) will be moved to the Staff role.`
            : `Delete "${roleName}"?`;
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="roleId" value={roleId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        Delete
      </button>
    </form>
  );
}
