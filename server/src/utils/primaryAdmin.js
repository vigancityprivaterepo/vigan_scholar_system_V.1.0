const getPrimaryAdminEmail = () => String(process.env.PRIMARY_ADMIN_EMAIL || '').trim().toLowerCase();

const isPrimaryAdminEmail = (email) => {
  const primaryAdminEmail = getPrimaryAdminEmail();
  return Boolean(primaryAdminEmail) && String(email || '').trim().toLowerCase() === primaryAdminEmail;
};

const getEffectiveRole = (user) => {
  if (isPrimaryAdminEmail(user?.email)) return 'SUPER_ADMIN';
  return user?.role;
};

module.exports = { getPrimaryAdminEmail, isPrimaryAdminEmail, getEffectiveRole };
