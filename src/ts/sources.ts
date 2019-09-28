import AjaxMonitor from './monitors/AjaxMonitor';
import ElementMonitor from './monitors/ElementMonitor';
import DocumentMonitor from './monitors/DocumentMonitor';
import EventLagMonitor from './monitors/EventLagMonitor';

const SOURCES: {
    [index: string]:
        AjaxMonitor | ElementMonitor | DocumentMonitor | EventLagMonitor;
} = {
    ajax: AjaxMonitor,
    elements: ElementMonitor,
    document: DocumentMonitor,
    eventLag: EventLagMonitor
};

export default SOURCES;
