import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { giftPredict, expressionTensor, tokenDistribution } from "../shared/ai-lab.mjs";
const baseline = JSON.parse(await readFile("tests/fixtures/ai-lab/baseline.json", "utf8"));

test("all four Gift outputs agree with the current original NumPy checkpoint", async () => {
  const model = JSON.parse(await readFile("public/assets/ai-lab/gift-v1/model.json", "utf8"));
  for (const input of baseline.gift) {
    const actual = giftPredict(model, input.scores, input.category);
    assert.ok(Math.abs(actual.raw - input.raw) < 1e-14);
    assert.ok(Math.abs(actual.score - input.score) < 1e-13);
  }
  assert.throws(() => giftPredict(model, [20, 7, 7, 7, 7, 7, 7], 2));
});
test("browser preprocessing equals Pillow grayscale + antialiased bilinear, pixel for pixel", async () => {
  const rgba = await readFile("tests/fixtures/ai-lab/expression-rgba.bin");
  const actual = expressionTensor(rgba, baseline.expression.width, baseline.expression.height);
  assert.equal(actual.length, 2304);
  assert.deepEqual(Array.from(actual), baseline.expression.input);
});
test("sampling excludes original special tokens, retains EOS and preserves top-k", async () => {
  const vocab = JSON.parse(await readFile("public/assets/ai-lab/verse-v1/vocab.json", "utf8"));
  const logits = baseline.poetry.steps[0].logits;
  for (const [temperature, topK] of [
    [0.55, 5],
    [0.7, 15],
    [0.9, 30],
  ]) {
    const distribution = tokenDistribution(logits, vocab, temperature, topK);
    assert.equal(distribution.length, topK);
    assert.ok(
      distribution.every((t) => ![vocab["<PAD>"], vocab["<BOS>"], vocab["<UNK>"]].includes(t.id)),
    );
    assert.ok(Math.abs(distribution.reduce((sum, t) => sum + t.probability, 0) - 1) < 1e-14);
  }
});
test("published model bytes match the verified original export manifest", async () => {
  const manifest = JSON.parse(await readFile("data/ai-lab-models.json", "utf8"));
  for (const project of manifest.projects)
    for (const file of project.resources) {
      const data = await readFile("dist" + file.path);
      assert.equal(data.length, file.bytes);
      assert.equal(createHash("sha256").update(data).digest("hex"), file.sha256);
      assert.ok(data.length < 100 * 1024 * 1024);
      assert.notEqual(
        data.subarray(0, 42).toString(),
        "version https://git-lfs.github.com/spec/v1",
      );
    }
});
