export { AGENT_AFFORDANCES, AGENT_PRODUCT, discoveryBody, getAffordance } from './affordances';
export {
    listTabs,
    openTab,
    readTab,
    navigateTab,
    clickTab,
    typeTab,
    disposeTab,
    __dropLiveContexts,
    __resetAgentTabs
} from './browserTabs';
export { invokeAffordance } from './invoke';
export type { Affordance, AgentTab, HandlerResult, PageLink } from './types';
