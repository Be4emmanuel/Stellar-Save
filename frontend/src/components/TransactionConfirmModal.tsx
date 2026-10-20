/**
 * Re-export shim — the component now lives in TransactionConfirmModal/
 * This file preserves backwards compatibility for any existing direct import paths.
 */
export {
  TransactionConfirmModal,
  default,
  type TransactionConfirmModalProps,
  type TransactionDetails,
  type TxType,
} from './TransactionConfirmModal/index';
