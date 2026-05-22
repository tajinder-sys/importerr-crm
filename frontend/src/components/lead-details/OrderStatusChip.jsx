import Chip from '../common/ui/Chip';
import { getChipVariant } from '../../utils/chipConstants';
import { formatLabel } from '../../utils/helpers';

export default function OrderStatusChip({ status, className = '' }) {
  if (!status) return null;
  return (
    <Chip
      label={formatLabel(status)}
      variant={getChipVariant('ORDER_STATUS', status)}
      className={className}
    />
  );
}
