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
  const original = plain(form);
  form.description = 'Updated training';
  const payload = organizationPayload(form, false, original);
  assert.equal(payload.description, 'Updated training');
  assert.deepEqual(plain(payload), { description: 'Updated training' });
  assert.equal(Object.hasOwn(payload, 'course_ids'), false);
  for (const field of ['id', 'admin', 'created_at', 'student_count', 'course_count', 'average_completion']) {
    assert.equal(Object.hasOwn(payload, field), false, field);
  }
});

test('organization edits send details independently of selected course assignments', () => {
  const form = organizationToForm({ ...organization, course_count: 0 });
  const original = plain(form);
  assert.equal(Array.isArray(form.course_ids), true);
  assert.deepEqual(plain(form.course_ids), []);
  form.course_ids.push('course-1', 'course-2');
  const payload = organizationPayload(form, false, original);
  assert.equal(Object.hasOwn(payload, 'course_ids'), false);
  assert.deepEqual(plain(payload), {});
});

test('missing course counts never imply that existing assignments are empty', () => {
  const form = organizationToForm({ ...organization, course_count: undefined });
  assert.equal(form.course_ids, undefined);
  assert.equal(Object.hasOwn(organizationPayload(form, false, plain(form)), 'course_ids'), false);
});

test('creation includes courses and password; editing details never clears known assignments', () => {
  const form = newOrganizationForm();
  form.name = 'New organization';
  form.org_admin = { ...organization.admin, temp_password: 'test-only-password' };
  const createPayload = organizationPayload(form, true);
  assert.equal(createPayload.org_admin.temp_password, 'test-only-password');
  assert.deepEqual(plain(createPayload.course_ids), []);
  const existing = organizationToForm({ ...organization, course_ids: ['course-1'] });
  const original = plain(existing);
  existing.course_ids = [];
  existing.org_admin.temp_password = 'new-test-password';
  const updatePayload = organizationPayload(existing, false, original);
  assert.equal(Object.hasOwn(updatePayload, 'course_ids'), false);
  assert.equal(updatePayload.org_admin.temp_password, 'new-test-password');
});

test('organization updates send only changed nested admin fields and preserve explicit empty values', () => {
  const original = organizationToForm(organization);
  const changed = { ...original, description: '', student_limit: 3000, org_admin: { ...original.org_admin, email: 'new@example.com' } };
  assert.deepEqual(plain(organizationPayload(changed, false, original)), { description: '', student_limit: 3000, org_admin: { email: 'new@example.com' } });
  assert.deepEqual(plain(organizationPayload({ ...original, name: ` ${original.name} ` }, false, original)), {});
});

test('saving an organization edit uses PATCH with only changed details at the existing URL', async () => {
  const calls = [];
  let saved = 0;
  const form = organizationToForm(organization);
  const react = require('react');
  const refs = [];
  let refCursor = 0;
  const api = {
    patch: async (url, body) => { calls.push({ method: 'PATCH', url, body: plain(body) }); },
  };
  const componentSource = readFileSync(new URL('../component/CreateOrganization.tsx', import.meta.url), 'utf8');
  const componentCompiled = ts.transpileModule(componentSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  const localRequire = name => {
    if (name === 'react') return { ...react, useState: value => [value, () => {}], useRef: value => refs[refCursor++] ??= { current: value } };
    if (name === '@/src/utils/connection') return { default: api, ApiError: class extends Error {} };
    if (name === '@/src/services/organizationData') return exported;
    if (name === '@/src/services/courses') return {};
    if (name === 'sonner') return { toast: { success() {}, info() {} } };
    return require(name);
  };
  vm.runInNewContext(`(function(require, module, exports) {${componentCompiled}\n})`, { Error })(localRequire, loaded, loaded.exports);
  const render = formData => {
    refCursor = 0;
    return loaded.exports.CreateOrganization({
      formData, courseData: [], isEdit: { isNew: false }, setFormData() {}, onCancel() {}, onSave() { saved++; },
    });
  };
  render(form);
  const tree = render({ ...form, description: 'Updated description' });
  function findForm(node) {
    if (Array.isArray(node)) return node.map(findForm).find(Boolean);
    if (!node || typeof node !== 'object') return undefined;
    return node.type === 'form' ? node : findForm(node.props?.children);
  }
  await findForm(tree).props.onSubmit({ preventDefault() {} });
  assert.equal(saved, 1);
  assert.deepEqual(calls, [{ method: 'PATCH', url: '/organizations/organization-1/', body: {
    description: 'Updated description',
  } }]);
  await findForm(render({ ...form, description: 'Updated description' })).props.onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 1);
});
