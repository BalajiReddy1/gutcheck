/** Build-time stand-in for the dev tuning panel, so dialkit and its stylesheet
 *  never reach a production bundle. See the webpack alias in next.config.mjs. */
export default function DesignDialsPanel() {
  return null;
}
