const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  req,
  action,
  module,
  recordId,
  recordType,
  previousValue = null,
  newValue = null,
  details = '',
}) => {
  try {
    const user = req?.user || {
      name: 'System Engine',
      email: 'system@finguard.internal',
      role: 'Super Admin',
    };

    const ip = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';

    await AuditLog.create({
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action,
      module,
      recordId: String(recordId || 'N/A'),
      recordType,
      ipAddress: typeof ip === 'string' ? ip.replace('::ffff:', '') : '127.0.0.1',
      previousValue,
      newValue,
      details,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[Audit Logger Error]', error.message);
  }
};

module.exports = { logAudit };
