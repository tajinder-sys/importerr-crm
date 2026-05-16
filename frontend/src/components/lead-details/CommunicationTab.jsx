import { Card, CardContent, CardHeader } from '../common/ui/Card';
import Button from '../common/ui/Button';
import SearchableSelect from '../common/ui/SearchableSelect';
import { formatDateIndian, formatLabel } from '../../utils/helpers';
import { UiSectionTitle } from '../common/ui/Typography';

const CommunicationTab = ({
  lead,
  leadCommunications,
  canReplyCommunication,
  replySource,
  setReplySource,
  communicationSourceOptions,
  effectiveReplySource,
  replyMessage,
  setReplyMessage,
  onSendCommunication,
  sendingCommunication
}) => (
  <Card className="rounded-b-2xl rounded-t-none border-gray-200 shadow-sm">
    <CardHeader className="border-gray-100">
      <UiSectionTitle>Communication</UiSectionTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {leadCommunications.length === 0 ? (
        <p className="text-sm text-gray-500">No communication found for this lead yet.</p>
      ) : (
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {leadCommunications.map((communication) => {
            const inbound = communication.direction === 'inbound';
            return (
              <div key={communication._id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`w-full max-w-3xl rounded-xl border p-3 ${
                    inbound
                      ? 'border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20'
                      : 'border-emerald-100 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/20'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      {inbound ? 'Client' : 'Team Member'} • {formatLabel(communication.source)}
                    </p>
                    <p className="text-xs text-gray-500">{formatDateIndian(communication.createdAt)}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{communication.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canReplyCommunication ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Reply to Lead</h3>
          {lead?.source === 'importerr_inquiry' ? (
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Communication Source</label>
              <SearchableSelect
                name="replySource"
                value={replySource}
                onChange={(event) => setReplySource(event.target.value)}
                options={communicationSourceOptions}
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Replies will be sent through <span className="font-medium">{formatLabel(effectiveReplySource)}</span>.
            </p>
          )}
          {lead?.source === 'email' && (!lead?.gmailThreadId || !lead?.accountId) ? (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
              This lead is missing Gmail thread or account linkage. Replies cannot be sent until a new email is received on the connected inbox.
            </p>
          ) : null}
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Message</label>
            <textarea
              value={replyMessage}
              onChange={(event) => setReplyMessage(event.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              onClick={onSendCommunication}
              loading={sendingCommunication}
              disabled={
                sendingCommunication
                || !replyMessage.trim()
                || (lead?.source === 'email' && (!lead?.gmailThreadId || !lead?.accountId))
              }
            >
              Send Reply
            </Button>
          </div>
        </div>
      ) : null}
    </CardContent>
  </Card>
);

export default CommunicationTab;
