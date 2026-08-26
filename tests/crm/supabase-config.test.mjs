import assert from 'node:assert/strict';
import test from 'node:test';

import { isValidSupabaseUrl } from '../../lib/supabase/config.mjs';

test('accepts only HTTP(S) Supabase URLs with a hostname', () => {
  assert.equal(isValidSupabaseUrl('https://example.supabase.co'), true);
  assert.equal(isValidSupabaseUrl('http://localhost:54321'), true);
  assert.equal(isValidSupabaseUrl('example.supabase.co'), false);
  assert.equal(isValidSupabaseUrl('not-a-url'), false);
  assert.equal(isValidSupabaseUrl(''), false);
  assert.equal(isValidSupabaseUrl(null), false);
});
