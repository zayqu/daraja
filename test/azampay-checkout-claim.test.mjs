import test from "node:test";
import assert from "node:assert/strict";
import {
  claimSandboxCheckout, recordSandboxCheckoutResponse, markSandboxCheckoutRejected,
  markSandboxCheckoutUnknown,
} from "../lib/payments/azampay-checkout-claim.mjs";

function fakeDB() {
  const data = {
    id: "attempt1", environment: "sandbox", provider: "AZAMPAY",
    checkoutState: "NOT_STARTED", status: "PENDING",
    providerTransactionId: null,
    booking: { ownerUserId: "owner1", status: "APPROVED" },
  };
  let updateCount = 0;
  const db = {
    paymentAttempt: {
      updateMany: async ({ where, data: changes }) => {
        let match = true;
        for (const [key, value] of Object.entries(where)) {
          if (key === "booking") {
            if (data.booking.ownerUserId !== value.ownerUserId || data.booking.status !== value.status) match = false;
          } else if (data[key] !== value) match = false;
        }
        if (!match) return { count: 0 };
        updateCount++;
        Object.assign(data, changes);
        return { count: 1 };
      },
    },
  };
  return { db, data, get updateCount() { return updateCount; } };
}

test("first authorized owner claims an approved attempt exactly once", async () => {
  const f = fakeDB();
  const args = { prisma: f.db, actor: { id: "owner1", role: "EMPLOYER" }, attemptId: "attempt1" };
  assert.equal((await claimSandboxCheckout(args)).claimed, true);
  assert.equal(f.data.checkoutState, "CLAIMED");
  await assert.rejects(claimSandboxCheckout(args), /CHECKOUT_ALREADY_CLAIMED/);
  assert.equal(f.updateCount, 1);
});

test("wrong actor and owner cannot claim checkout", async () => {
  const f = fakeDB();
  for (const actor of [
    null, { id: "owner1", role: "JOB_SEEKER" },
    { id: "admin", role: "ADMIN" },
  ]) {
    await assert.rejects(claimSandboxCheckout({ prisma: f.db, actor, attemptId: "attempt1" }), /CHECKOUT_OWNER_REQUIRED/);
  }
  await assert.rejects(claimSandboxCheckout({
    prisma: f.db, actor: { id: "other", role: "EMPLOYER" }, attemptId: "attempt1",
  }), /CHECKOUT_ALREADY_CLAIMED/);
  assert.equal(f.updateCount, 0);
});

test("provider transaction ID is persisted once and cannot be replaced", async () => {
  const f = fakeDB();
  await claimSandboxCheckout({
    prisma: f.db, actor: { id: "owner1", role: "EMPLOYER" }, attemptId: "attempt1",
  });
  const result = await recordSandboxCheckoutResponse({
    prisma: f.db, attemptId: "attempt1",
    response: { success: true, transactionId: "sandboxreceipt123" },
  });
  assert.deepEqual(result, { attemptId: "attempt1", status: "PENDING" });
  assert.equal(f.data.providerTransactionId, "sandboxreceipt123");
  assert.equal(f.data.checkoutState, "INITIATED");
  await assert.rejects(recordSandboxCheckoutResponse({
    prisma: f.db, attemptId: "attempt1",
    response: { success: true, transactionId: "differentreceipt123" },
  }), /CHECKOUT_RECEIPT_CONFLICT/);
});

test("ambiguous timeout is UNKNOWN and cannot send another checkout", async () => {
  const f = fakeDB();
  const owner = { id: "owner1", role: "EMPLOYER" };
  await claimSandboxCheckout({ prisma: f.db, actor: owner, attemptId: "attempt1" });
  assert.equal((await markSandboxCheckoutUnknown({ prisma: f.db, attemptId: "attempt1" })).requiresReconciliation, true);
  assert.equal(f.data.checkoutState, "UNKNOWN");
  assert.equal(f.data.status, "UNKNOWN");
  await assert.rejects(claimSandboxCheckout({
    prisma: f.db, actor: owner, attemptId: "attempt1",
  }), /CHECKOUT_ALREADY_CLAIMED/);
  assert.equal((await markSandboxCheckoutUnknown({ prisma: f.db, attemptId: "attempt1" })).requiresReconciliation, false);
});

test("unconfirmed checkout response never writes a provider transaction ID", async () => {
  const f = fakeDB();
  await claimSandboxCheckout({ prisma: f.db, actor: { id: "owner1", role: "EMPLOYER" }, attemptId: "attempt1" });
  await assert.rejects(recordSandboxCheckoutResponse({
    prisma: f.db, attemptId: "attempt1", response: { success: true },
  }), /CHECKOUT_RESPONSE_UNCONFIRMED/);
  assert.equal(f.data.providerTransactionId, null);
  assert.equal(f.data.checkoutState, "CLAIMED");
});

test("a definitive AzamPay refusal closes the claimed attempt as FAILED, never twice", async () => {
  const f = fakeDB();
  const owner = { id: "owner1", role: "EMPLOYER" };
  // Not claimed yet: nothing to close.
  assert.equal((await markSandboxCheckoutRejected({ prisma: f.db, attemptId: "attempt1" })).closed, false);
  await claimSandboxCheckout({ prisma: f.db, actor: owner, attemptId: "attempt1" });
  assert.equal((await markSandboxCheckoutRejected({ prisma: f.db, attemptId: "attempt1" })).closed, true);
  assert.equal(f.data.status, "FAILED");
  assert.equal(f.data.checkoutState, "CLAIMED");
  assert.equal(f.data.providerTransactionId, null);
  assert.equal((await markSandboxCheckoutRejected({ prisma: f.db, attemptId: "attempt1" })).closed, false);
  await assert.rejects(claimSandboxCheckout({ prisma: f.db, actor: owner, attemptId: "attempt1" }),
    /CHECKOUT_ALREADY_CLAIMED/);
  await assert.rejects(markSandboxCheckoutRejected({ prisma: f.db, attemptId: "" }), /CHECKOUT_RECORD_INVALID/);
});
