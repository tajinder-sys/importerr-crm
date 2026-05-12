import { cn } from '../../../utils/helpers';
import { UiPageDescription, UiPageTitle } from './Typography';

/**
 * Standard page header: title, optional description, optional meta row, optional right actions.
 */
const PageHeader = ({ title, description, meta, actions, className }) => (
  <div
    className={cn(
      'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
      className
    )}
  >
    <div className="min-w-0">
      <UiPageTitle>{title}</UiPageTitle>
      {description ? <UiPageDescription>{description}</UiPageDescription> : null}
      {meta ? <div className="min-w-0">{meta}</div> : null}
    </div>
    {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

export default PageHeader;
