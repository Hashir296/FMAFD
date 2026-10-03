const express = require('express');
const router = express.Router();
const {
  getInvestigations,
  getInvestigationById,
  updateInvestigationStatus,
  addInvestigatorNote,
  addEvidence,
  assignInvestigator,
} = require('../controllers/investigationController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', getInvestigations);
router.get('/:id', getInvestigationById);
router.patch('/:id/status', authorize('Super Admin', 'Finance Manager', 'Fraud Analyst'), updateInvestigationStatus);
router.post('/:id/notes', authorize('Super Admin', 'Finance Manager', 'Fraud Analyst'), addInvestigatorNote);
router.post('/:id/evidence', authorize('Super Admin', 'Finance Manager', 'Fraud Analyst'), addEvidence);
router.patch('/:id/assign', authorize('Super Admin', 'Finance Manager', 'Fraud Analyst'), assignInvestigator);

module.exports = router;
