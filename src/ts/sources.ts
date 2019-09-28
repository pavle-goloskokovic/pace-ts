import AjaxMonitor from './monitors/AjaxMonitor';
import ElementMonitor from './monitors/ElementMonitor';
import DocumentTracker from './trackers/DocumentTracker';
import EventLagTracker from './trackers/EventLagTracker';
import Monitor from './monitors/Monitor';

const SOURCES: {
    [index: string]: typeof Monitor;
} = {
    ajax: AjaxMonitor,
    elements: ElementMonitor,
    document: DocumentTracker,
    eventLag: EventLagTracker
};

export default SOURCES;
