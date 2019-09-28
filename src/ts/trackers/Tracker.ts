import Scaler from '../Scaler';

export default class Tracker {

    progress = 0;

    // Each source of progress data has it's own scaler to smooth its output
    scaler = new Scaler(this);

}
