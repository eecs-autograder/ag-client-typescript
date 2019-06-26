import { ID, SaveableAPIObject } from "./base";
import { HttpClient } from "./http_client";
import { filter_keys, safe_assign } from "./utils";


export class SubmissionData {
    pk: ID;
    group: ID;

    timestamp: string;
    submitter: string;

    submitted_filenames: string[];
    discarded_files: string[];
    missing_files: {[key: string]: number};

    status: string;

    count_towards_daily_limit: boolean;
    is_past_daily_limit: boolean;
    is_bonus_submission: boolean;
    count_towards_total_limit: boolean;

    does_not_count_for: string[];

    position_in_queue: number;

    last_modified: string;

    constructor(args: SubmissionData) {
        this.pk = args.pk;
        this.group = args.group;

        this.timestamp = args.timestamp;
        this.submitter = args.submitter;

        this.submitted_filenames = args.submitted_filenames;
        this.discarded_files = args.discarded_files;
        this.missing_files = args.missing_files;

        this.status = args.status;

        this.count_towards_daily_limit = args.count_towards_daily_limit;
        this.is_past_daily_limit = args.is_past_daily_limit;
        this.is_bonus_submission = args.is_bonus_submission;
        this.count_towards_total_limit = args.count_towards_total_limit;

        this.does_not_count_for = args.does_not_count_for;

        this.position_in_queue = args.position_in_queue;

        this.last_modified = args.last_modified;
    }
}

export interface SubmissionObserver {
    update_submission_created(submission: Submission): void;
    update_submission_changed(submission: Submission): void;
}

export class Submission extends SubmissionData implements SaveableAPIObject {
    private static _subscribers = new Set<SubmissionObserver>();

    static subscribe(observer: SubmissionObserver) {
        Submission._subscribers.add(observer);
    }

    static unsubscribe(observer: SubmissionObserver) {
        Submission._subscribers.delete(observer);
    }

    static async get_all_from_group(group_pk: ID): Promise<Submission[]> {
        let response = await HttpClient.get_instance().get<SubmissionData[]>(
            `/groups/${group_pk}/submissions/`);
        return response.data.map((data) => new Submission(data));
    }

    static async get_by_pk(submission_pk: ID): Promise<Submission> {
        let response = await HttpClient.get_instance().get<SubmissionData>(
            `/submissions/${submission_pk}/`);
        return new Submission(response.data);
    }

    static async create(group_pk: ID, files: File[]): Promise<Submission> {
        let form_data = new FormData();
        for (let file of files) {
            form_data.append('submitted_files', file, file.name);
        }
        let response = await HttpClient.get_instance().post<SubmissionData>(
            `/groups/${group_pk}/submissions/`, form_data);
        let result = new Submission(response.data);
        Submission.notify_submission_created(result);
        return result;
    }

    static notify_submission_created(submission: Submission) {
        for (let subscriber of Submission._subscribers) {
            subscriber.update_submission_created(submission);
        }
    }

    async get_file_content(filename: string): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${this.pk}/file/?filename=${filename}`);
        return response.data;
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<SubmissionData>(
            `/submissions/${this.pk}/`, filter_keys(this, Submission.EDITABLE_FIELDS));
        safe_assign(this, response.data);
        Submission.notify_submission_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;

        let response = await HttpClient.get_instance().get<SubmissionData>(
            `/submissions/${this.pk}/`);
        safe_assign(this, response.data);

        if (last_modified !== this.last_modified) {
            Submission.notify_submission_changed(this);
        }
    }

    async remove_from_queue(): Promise<void> {
        await HttpClient.get_instance().post(`/submissions/${this.pk}/remove_from_queue/`);
        this.status = GradingStatus.removed_from_queue;
        Submission.notify_submission_changed(this);
    }

    static notify_submission_changed(submission: Submission) {
        for (let subscriber of Submission._subscribers) {
            subscriber.update_submission_changed(submission);
        }
    }

    static readonly EDITABLE_FIELDS: ReadonlyArray<(keyof Submission)> = [
        'count_towards_daily_limit',
        'count_towards_total_limit'
    ];
}

export enum GradingStatus {
    // The submission has been accepted and saved to the database
    received = 'received',

    // The submission has been queued is waiting to be graded
    queued = 'queued',

    being_graded = 'being_graded',

    // Non-deferred test cases have finished and the group can submit
    // again.
    waiting_for_deferred = 'waiting_for_deferred',

    // All test cases have finished grading.
    finished_grading = 'finished_grading',

    // A student removed their submission from the queue before it
    // started being graded.
    removed_from_queue = 'removed_from_queue',

    // Something unexpected occurred during the grading process.
    error = 'error',
}