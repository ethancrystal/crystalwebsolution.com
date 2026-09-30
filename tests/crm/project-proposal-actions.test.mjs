import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PROPOSAL_FILE_TYPES,
  PROPOSAL_MAX_BYTES,
  isProposalFileType,
  normalizeProposalTitle,
} from '../../lib/crm/project-contract.mjs';

const actionsPath = 'app/actions/project-actions.js';

function actionBody(source, name) {
  const match = source.match(new RegExp(`export async function ${name}\\(formData\\) \\{[\\s\\S]*?\\n\\}\\n`));
  assert.ok(match, `${name} exists`);
  return match[0];
}

const ACTIONS = [
  ['createProjectProposal', 'create_project_proposal'],
  ['replaceProposalDocument', 'reserve_proposal_document'],
  ['finalizeProposalDocument', 'finalize_proposal_document'],
  ['renameProjectProposal', 'rename_project_proposal'],
  ['withdrawProjectProposal', 'withdraw_project_proposal'],
];

test('proposal titles are 3 to 120 characters, whitespace collapsed', () => {
  assert.equal(normalizeProposalTitle('  Logo   proposal '), 'Logo proposal');
  assert.equal(normalizeProposalTitle('abc'), 'abc');
  assert.equal(normalizeProposalTitle('a'.repeat(120)).length, 120);
  for (const bad of ['', 'ab', '   ', 'a'.repeat(121), null, undefined, 7]) {
    assert.throws(() => normalizeProposalTitle(bad), /Proposal title must be 3 to 120 characters\./);
  }
});

test('only a PDF or a Word (.docx) document, at most 10 MiB', () => {
  assert.deepEqual(PROPOSAL_FILE_TYPES.map((type) => type.extension), ['.pdf', '.docx']);
  assert.equal(PROPOSAL_MAX_BYTES, 10 * 1024 * 1024);
  assert.equal(isProposalFileType('application/pdf'), true);
  assert.equal(isProposalFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), true);
  for (const other of ['image/png', 'text/plain', 'application/msword', '', null, undefined]) {
    assert.equal(isProposalFileType(other), false, String(other));
  }
});

test('the five proposal actions are staff-only, validate ids, call their RPC and refresh every project page', async () => {
  const source = await readFile(actionsPath, 'utf8');
  for (const [action, rpc] of ACTIONS) {
    const body = actionBody(source, action);
    assert.match(body, /authenticatedProfile\(\['project_manager', 'admin'\]\)/, `${action} is staff only`);
    assert.doesNotMatch(body, /\['client'/, action);
    assert.match(body, /isCanonicalUuid\(projectId\)/, action);
    assert.match(body, new RegExp(`rpc\\('${rpc}'`), action);
    assert.match(body, /revalidateAllProjectPaths\(projectId\)/, action);
    assert.match(body, /databaseFailure\(/, `${action} fails with a generic message`);
  }
});

test('create and rename re-validate the title; create and replace re-validate the file on the server', async () => {
  const source = await readFile(actionsPath, 'utf8');
  for (const action of ['createProjectProposal', 'renameProjectProposal']) {
    assert.match(actionBody(source, action), /normalizeProposalTitle\(formString\(formData, 'title'\)\)/, action);
  }
  for (const action of ['createProjectProposal', 'replaceProposalDocument']) {
    assert.match(actionBody(source, action), /proposalFileFields\(formData\)/, action);
  }
  const helper = source.slice(source.indexOf('function proposalFileFields'), source.indexOf('export async function createProjectProposal'));
  assert.match(helper, /isProposalFileType\(mimeType\)/);
  assert.match(helper, /sizeBytes > PROPOSAL_MAX_BYTES/);
});

test('downloads of a proposal go through the RLS-checked document row and a 60 second link', async () => {
  const source = await readFile(actionsPath, 'utf8');
  const body = actionBody(source, 'createAttachmentDownloadUrl');
  assert.match(body, /\['attachment', 'deliverable', 'proposal'\]\.includes\(kind\)/);
  assert.match(body, /\.from\('project_proposal_documents'\)[\s\S]*?\.eq\('status', 'ready'\)/);
  assert.match(body, /createSignedUrl\(asset\.storage_path, 60\)/);
});
