import { ID } from './base';
import { HttpClient } from './http_client';
import { safe_assign } from './utils';

export class RerunSubmissionTaskData {
    pk: ID;
    project: ID;

    progress: number;
    is_cancelled: boolean;
    error_msg: string;
    // creator: ID;  // We'll add this member once we fix its type in the API
    created_at: string;
    has_error: boolean;

    rerun_all_submissions: boolean;
    submission_pks: ID[];

    rerun_all_ag_test_suites: boolean;
    ag_test_suite_data: {[key: number]: ID[]};

    rerun_all_mutation_test_suites: boolean;
    mutation_suite_pks: ID[];

    constructor(args: RerunSubmissionTaskData) {
        this.pk = args.pk;
        this.project = args.project;

        this.progress = args.progress;
        this.is_cancelled = args.is_cancelled;
        this.error_msg = args.error_msg;
        this.created_at = args.created_at;
        this.has_error = args.has_error;

        this.rerun_all_submissions = args.rerun_all_submissions;
        this.submission_pks = args.submission_pks;

        this.rerun_all_ag_test_suites = args.rerun_all_ag_test_suites;
        this.ag_test_suite_data = args.ag_test_suite_data;

        this.rerun_all_mutation_test_suites = args.rerun_all_mutation_test_suites;
        this.mutation_suite_pks = args.mutation_suite_pks;
    }
}

export class RerunSubmissionTask extends RerunSubmissionTaskData {
    static async create(project_pk: ID, data: NewRerunSubmissionTaskData) {
        let response = await HttpClient.get_instance().post<RerunSubmissionTaskData>(
            `/projects/${project_pk}/rerun_submissions_tasks/`, data);
        return new RerunSubmissionTask(response.data);
    }

    static async get_all_from_project(project_pk: ID) {
        let response = await HttpClient.get_instance().get<RerunSubmissionTaskData[]>(
            `/projects/${project_pk}/rerun_submissions_tasks/`);
        return response.data.map((data) => new RerunSubmissionTask(data)).sort(
            (first, second) => second.pk - first.pk);
    }

    static async get_by_pk(rerun_submission_task_pk: ID) {
        let response = await HttpClient.get_instance().get<RerunSubmissionTaskData>(
            `/rerun_submissions_tasks/${rerun_submission_task_pk}/`);
        return new RerunSubmissionTask(response.data);
    }

    async cancel() {
        let response = await HttpClient.get_instance().post<RerunSubmissionTaskData>(
            `/rerun_submissions_tasks/${this.pk}/cancel/`);
        safe_assign(this, response.data);
    }
}

export class NewRerunSubmissionTaskData {
    rerun_all_submissions?: boolean;
    submission_pks?: ID[];

    rerun_all_ag_test_suites?: boolean;
    ag_test_suite_data?: {[key: number]: ID[]};

    rerun_all_mutation_test_suites?: boolean;
    mutation_suite_pks?: ID[];

    constructor(args: NewRerunSubmissionTaskData) {
        this.rerun_all_submissions = args.rerun_all_submissions;
        this.submission_pks = args.submission_pks;

        this.rerun_all_ag_test_suites = args.rerun_all_ag_test_suites;
        this.ag_test_suite_data = args.ag_test_suite_data;

        this.rerun_all_mutation_test_suites = args.rerun_all_mutation_test_suites;
        this.mutation_suite_pks = args.mutation_suite_pks;
    }
}
