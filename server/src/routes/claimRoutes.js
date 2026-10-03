const express = require('express');
const router = express.Router();
const { getClaims, createClaim, reviewClaim, postClaim } = require('../controllers/claimController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.get('/', getClaims);
router.post('/', createClaim);
router.patch('/:id/review', authorize('Owner', 'Super Admin', 'Finance Manager', 'Department Manager'), reviewClaim);
router.post('/:id/post', authorize('Owner', 'Super Admin', 'Finance Manager', 'Accountant'), postClaim);

module.exports = router;
