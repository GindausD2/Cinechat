# Disabled legacy billing reference

These .txt files preserve the previous payment implementation for historical review. They are not executable application routes, not TypeScript build inputs, and not a supported way to enable billing. The Stripe SDK has been removed. Current `/api/billing` and webhook routes always reject requests. `billingConfigured()` is always false.

Legacy database models and records remain intact; this version neither collects payments nor imposes subscription quotas. Account deletion follows the existing cascading model. If historical financial records ever represent real transactions, the operator must review applicable record-retention obligations before enabling deletion in that environment. No real transactions were performed in this task.
