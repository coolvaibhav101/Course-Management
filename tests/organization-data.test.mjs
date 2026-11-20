import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/services/organizationData.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exported = {};
vm.runInNewContext(`(function(exports) {${compiled}\n})`)(exported);
const { newOrganizationForm, organizationToForm, organizationPayload } = exported;
const plain = (value) => JSON.parse(JSON.stringify(value));

// Same response shape supplied for GET /organizations/; no password/course IDs.
const organization = {
  id: 'organization-1', name: 'Fintech', description: 'Finance training',
  student_limit: 2000, expiry_date: '2026-03-29', status: 'ACTIVE',
  created_at: '2025-12-28T10:00:50.247450Z', student_count: 1, course_count: 1,
  admin: { name: 'Admin', email: 'admin@example.com', phone: '1234567890' },
  average_completion: 0,
};

test('returned admin fields prefill the form without inventing passwords or course IDs', () => {
  const form = organizationToForm(organization);
  assert.deepEqual(plain(form.org_admin), { ...organization.admin, temp_password: '' });
  assert.equal(form.id, organization.id);
  assert.equal(form.student_limit, organization.student_limit);
  assert.equal(form.expiry_date, organization.expiry_date);
  assert.equal(form.course_count, 1);
  assert.equal(form.course_ids, undefined);
});

test('editing other fields omits passwords, unknown assignments, and response-only fields', () => {
  const form = organizationToForm(organization);
  form.description = 'Updated training';
  const payload = organizationPayload(form, false);
  assert.equal(payload.description, 'Updated training');
  assert.deepEqual(plain(payload.org_admin), organization.admin);
  assert.equal(Object.hasOwn(payload, 'course_ids'), false);
  for (const field of ['id', 'admin', 'created_at', 'student_count', 'course_count', 'average_completion']) {
    assert.equal(Object.hasOwn(payload, field), false, field);
  }
});

test('organization edits send details independently of selected course assignments', () => {
  const form = organizationToForm({ ...organization, course_count: 0 });
  assert.equal(Array.isArray(form.course_ids), true);
  assert.deepEqual(plain(form.course_ids), []);
  form.course_ids.push('course-1', 'course-2');
  const payload = organizationPayload(form, false);
  assert.equal(Object.hasOwn(payload, 'course_ids'), false);
  assert.equal(Object.hasOwn(payload.org_admin, 'temp_password'), false);
});

test('missing course counts never imply that existing assignments are empty', () => {
  const form = organizationToForm({ ...organization, course_count: undefined });
  assert.equal(form.course_ids, undefined);
  assert.equal(Object.hasOwn(organizationPayload(form, false), 'course_ids'), false);
});

test('creation includes courses and password; editing details never clears known assignments', () => {
  const form = newOrganizationForm();
  form.name = 'New organization';
  form.org_admin = { ...organization.admin, temp_password: 'test-only-password' };
  const createPayload = organizationPayload(form, true);
  assert.equal(createPayload.org_admin.temp_password, 'test-only-password');
  assert.deepEqual(plain(createPayload.course_ids), []);
  const existing = organizationToForm({ ...organization, course_ids: ['course-1'] });
  existing.course_ids = [];
  existing.org_admin.temp_password = 'new-test-password';
  const updatePayload = organizationPayload(existing, false);
  assert.equal(Object.hasOwn(updatePayload, 'course_ids'), false);
  assert.equal(updatePayload.org_admin.temp_password, 'new-test-password');
});
