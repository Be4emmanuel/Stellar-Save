#!/usr/bin/env node
// check-rust-drift.js — fails if the topics emitted by
// contracts/stellar-save/src/events.rs and the topics in schema.json diverge.
// Mirrors the `test_every_*_topic_*` unit tests in events.rs so the check also
// runs in CI without a Rust toolchain.

const fs = require('fs');
const path = require('path');

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'schema.json'), 'utf8'));
const eventsRs = fs.readFileSync(
  path.join(__dirname, '..', '..', 'contracts', 'stellar-save', 'src', 'events.rs'),
  'utf8'
);

// Ignore the test module, which mentions topics inside string literals.
const emitterSrc = eventsRs.split('#[cfg(test)]\nmod tests {')[0];

const schemaTopics = new Set(Object.values(schema.events).map((e) => e.topic));
const emittedTopics = new Set(
  [...emitterSrc.matchAll(/publish\(\s*\(\s*"([a-z0-9_]+)"/g)].map((m) => m[1])
);

const missingFromSchema = [...emittedTopics].filter((t) => !schemaTopics.has(t));
const missingEmitter = [...schemaTopics].filter((t) => !emittedTopics.has(t));

if (missingFromSchema.length || missingEmitter.length) {
  console.error('\n❌ events.rs ↔ schema.json drift detected!');
  if (missingFromSchema.length) {
    console.error('   Emitted in events.rs but missing from schema.json: ' + missingFromSchema.join(', '));
  }
  if (missingEmitter.length) {
    console.error('   In schema.json but no emitter in events.rs: ' + missingEmitter.join(', '));
  }
  process.exit(1);
}

console.log(`✅ events.rs and schema.json agree on ${schemaTopics.size} topics.`);
