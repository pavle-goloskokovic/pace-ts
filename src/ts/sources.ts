import AjaxMonitor from './monitors/AjaxMonitor';
import ElementMonitor from './monitors/ElementMonitor';
import DocumentMonitor from './monitors/DocumentMonitor';
import EventLagMonitor from './monitors/EventLagMonitor';
import Monitor from './monitors/Monitor';

const SOURCES: {
    [index: string]: typeof Monitor;
} = {
    ajax: AjaxMonitor,
    document: DocumentMonitor,
    elements: ElementMonitor,
    eventLag: EventLagMonitor
};

export default SOURCES;
