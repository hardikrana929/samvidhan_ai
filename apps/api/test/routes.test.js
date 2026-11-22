import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/server.js';

let server;
let base;
test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test('public learning API supplies lessons without quiz answers', async () => {
  const paths = await fetch(`${base}/api/v1/learning/paths`).then((response) => response.json());
  const quizzes = await fetch(`${base}/api/v1/quizzes`).then((response) => response.json());
  assert.equal(paths.items.length, 2);
  assert.equal(paths.items[0].lessons.length, 2);
  assert.equal('answer' in quizzes.items[0].questions[0], false);
});

test('quiz marks an attempt server-side and exposes explanations afterwards', async () => {
  const response = await fetch(`${base}/api/v1/quizzes/rights-basics/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers: { 'q-equality': 0, 'q-speech': 1 } }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.score, 2);
  assert.match(body.results[0].explanation, /Article 14/);
});

test('feedback and source-based awareness content validate their input', async () => {
  const feedback = await fetch(`${base}/api/v1/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      category: 'bug',
      message: 'The learning route needs review.',
    }),
  });
  const content = await fetch(`${base}/api/v1/content/awareness`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provisionId: 'article-14', format: 'short' }),
  });
  assert.equal(feedback.status, 201);
  assert.equal(content.status, 200);
  assert.match((await content.json()).content, /Article 14/);
});

test('full Constitution routes expose Articles, all Schedules and Appendices with source pages', async () => {
  const articles = await fetch(`${base}/api/v1/provisions`).then((response) => response.json());
  const schedules = await fetch(`${base}/api/v1/schedules`).then((response) => response.json());
  const article21A = await fetch(`${base}/api/v1/provisions/article-21a`).then((response) => response.json());
  const appendixII = await fetch(`${base}/api/v1/schedules/appendix-ii`).then((response) => response.json());
  assert.equal(articles.items.length, 481);
  assert.equal(schedules.items.filter((item) => item.kind === 'schedule').length, 12);
  assert.equal(schedules.items.filter((item) => item.kind === 'appendix').length, 3);
  assert.equal(article21A.identifier, 'Article 21A');
  assert.ok(article21A.pdfPageStart > 0);
  assert.match(appendixII.text, /Jammu and Kashmir/);
});
