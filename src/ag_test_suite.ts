import { AGTestCase, AGTestCaseData } from './ag_test_case';
import { Deletable, ID, SaveableAPIObject } from './base';
import { ExpectedStudentFile, ExpectedStudentFileData } from './expected_student_file';
import { HttpClient } from "./http_client";
import { InstructorFile, InstructorFileData } from './instructor_file';
import { SandboxDockerImageData } from './sandbox_docker_image';
import { filter_keys, safe_assign } from "./utils";


export class AGTestSuiteCoreData {
    pk: ID;
    name: string;
    project: ID;
    last_modified: string;

    read_only_instructor_files: boolean;

    setup_suite_cmd: string;
    setup_suite_cmd_name: string;

    sandbox_docker_image: SandboxDockerImageData;

    allow_network_access: boolean;
    deferred: boolean;

    normal_fdbk_config: AGTestSuiteFeedbackConfig;
    ultimate_submission_fdbk_config: AGTestSuiteFeedbackConfig;
    past_limit_submission_fdbk_config: AGTestSuiteFeedbackConfig;
    staff_viewer_fdbk_config: AGTestSuiteFeedbackConfig;

    constructor(args: AGTestSuiteCoreData) {
        this.pk = args.pk;
        this.name = args.name;
        this.project = args.project;
        this.last_modified = args.last_modified;

        this.read_only_instructor_files = args.read_only_instructor_files;

        this.setup_suite_cmd = args.setup_suite_cmd;
        this.setup_suite_cmd_name = args.setup_suite_cmd_name;

        this.sandbox_docker_image = args.sandbox_docker_image;

        this.allow_network_access = args.allow_network_access;
        this.deferred = args.deferred;

        this.normal_fdbk_config = args.normal_fdbk_config;
        this.ultimate_submission_fdbk_config = args.ultimate_submission_fdbk_config;
        this.past_limit_submission_fdbk_config = args.past_limit_submission_fdbk_config;
        this.staff_viewer_fdbk_config = args.staff_viewer_fdbk_config;
    }
}

interface AGTestSuiteCtorArgs extends AGTestSuiteCoreData {
    instructor_files_needed: InstructorFileData[];
    student_files_needed: ExpectedStudentFileData[];

    ag_test_cases: (AGTestCaseData | AGTestCase)[];
}

export interface AGTestSuiteData extends AGTestSuiteCtorArgs {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    _ag_test_suite_data_brand: unknown;
}

export interface AGTestSuiteObserver {
    update_ag_test_suite_created(ag_test_suite: AGTestSuite): void;
    update_ag_test_suite_changed(ag_test_suite: AGTestSuite): void;
    update_ag_test_suite_deleted(ag_test_suite: AGTestSuite): void;
    update_ag_test_suites_order_changed(project_pk: ID,
                                        ag_test_suite_order: ID[]): void;
}

export class AGTestSuite extends AGTestSuiteCoreData implements SaveableAPIObject, Deletable {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    private _ag_test_suite_brand: unknown;

    instructor_files_needed: InstructorFile[];
    student_files_needed: ExpectedStudentFile[];

    ag_test_cases: AGTestCase[];

    constructor(args: AGTestSuiteCtorArgs) {
        super(args);
        this.instructor_files_needed = args.instructor_files_needed.map(
            (data) => new InstructorFile(data));
        this.student_files_needed = args.student_files_needed.map(
            (data) => new ExpectedStudentFile(data));

        this.ag_test_cases = args.ag_test_cases.map(
            (data) => new AGTestCase(data));
    }


    private static _subscribers = new Set<AGTestSuiteObserver>();

    static subscribe(observer: AGTestSuiteObserver) {
        AGTestSuite._subscribers.add(observer);
    }

    static unsubscribe(observer: AGTestSuiteObserver) {
        AGTestSuite._subscribers.delete(observer);
    }

    static async get_all_from_project(project_pk: ID): Promise<AGTestSuite[]> {
        let response = await HttpClient.get_instance().get<AGTestSuiteData[]>(
            `/projects/${project_pk}/ag_test_suites/`);
        return response.data.map(suite_data => new AGTestSuite(suite_data));
    }

    static async get_by_pk(ag_test_suite_pk: ID): Promise<AGTestSuite> {
        let response = await HttpClient.get_instance().get<AGTestSuiteData>(
            `/ag_test_suites/${ag_test_suite_pk}/`);
        return new AGTestSuite(response.data);
    }

    static async create(project_pk: ID, data: NewAGTestSuiteData): Promise<AGTestSuite> {
        let response = await HttpClient.get_instance().post<AGTestSuiteData>(
            `/projects/${project_pk}/ag_test_suites/`, data);
        let result = new AGTestSuite(response.data);
        AGTestSuite.notify_ag_test_suite_created(result);
        return result;
    }

    static notify_ag_test_suite_created(ag_test_suite: AGTestSuite) {
        for (let subscriber of AGTestSuite._subscribers) {
            subscriber.update_ag_test_suite_created(ag_test_suite);
        }
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<AGTestSuiteData>(
            `/ag_test_suites/${this.pk}/`, filter_keys(this, AGTestSuite.EDITABLE_FIELDS));
        safe_assign(this, new AGTestSuite(response.data));
        AGTestSuite.notify_ag_test_suite_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;

        let reloaded = await AGTestSuite.get_by_pk(this.pk);
        safe_assign(this, reloaded);

        if (last_modified !== this.last_modified) {
            AGTestSuite.notify_ag_test_suite_changed(this);
        }
    }

    static notify_ag_test_suite_changed(ag_test_suite: AGTestSuite) {
        for (let subscriber of AGTestSuite._subscribers) {
            subscriber.update_ag_test_suite_changed(ag_test_suite);
        }
    }

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(`/ag_test_suites/${this.pk}/`);
        AGTestSuite.notify_ag_test_suite_deleted(this);
    }

    static notify_ag_test_suite_deleted(ag_test_suite: AGTestSuite) {
        for (let subscriber of AGTestSuite._subscribers) {
            subscriber.update_ag_test_suite_deleted(ag_test_suite);
        }
    }

    static async get_order(project_pk: ID): Promise<ID[]> {
        let response = await HttpClient.get_instance().get<ID[]>(
            `/projects/${project_pk}/ag_test_suites/order/`);
        return response.data;
    }

    static async update_order(project_pk: ID, ag_test_suite_order: ID[]): Promise<ID[]> {
        let response = await HttpClient.get_instance().put<ID[]>(
            `/projects/${project_pk}/ag_test_suites/order/`, ag_test_suite_order);

        AGTestSuite.notify_ag_test_suite_order_updated(project_pk, response.data);
        return response.data;
    }

    static notify_ag_test_suite_order_updated(project_pk: ID, ag_test_suite_order: ID[]) {
        for (let subscriber of AGTestSuite._subscribers) {
            subscriber.update_ag_test_suites_order_changed(
                project_pk, ag_test_suite_order);
        }
    }

    static readonly EDITABLE_FIELDS: ReadonlyArray<(keyof AGTestSuite)> = [
        'name',

        'instructor_files_needed',
        'student_files_needed',

        'read_only_instructor_files',

        'setup_suite_cmd',
        'setup_suite_cmd_name',

        'sandbox_docker_image',

        'allow_network_access',
        'deferred',

        'normal_fdbk_config',
        'ultimate_submission_fdbk_config',
        'past_limit_submission_fdbk_config',
        'staff_viewer_fdbk_config',
    ];
}

export interface AGTestSuiteFeedbackConfig {
    visible: boolean;
    show_individual_tests: boolean;

    show_setup_return_code: boolean;
    show_setup_timed_out: boolean;

    show_setup_stdout: boolean;
    show_setup_stderr: boolean;
}

export class NewAGTestSuiteData {
    name: string;

    instructor_files_needed?: InstructorFile[];
    student_files_needed?: ExpectedStudentFile[];

    read_only_instructor_files?: boolean;

    setup_suite_cmd?: string;
    setup_suite_cmd_name?: string;

    sandbox_docker_image?: SandboxDockerImageData;

    allow_network_access?: boolean;
    deferred?: boolean;

    normal_fdbk_config?: AGTestSuiteFeedbackConfig;
    ultimate_submission_fdbk_config?: AGTestSuiteFeedbackConfig;
    past_limit_submission_fdbk_config?: AGTestSuiteFeedbackConfig;
    staff_viewer_fdbk_config?: AGTestSuiteFeedbackConfig;

    constructor(args: NewAGTestSuiteData) {
        this.name = args.name;

        this.instructor_files_needed = args.instructor_files_needed;
        this.student_files_needed = args.student_files_needed;

        this.read_only_instructor_files =   args.read_only_instructor_files;

        this.setup_suite_cmd =  args.setup_suite_cmd;
        this.setup_suite_cmd_name = args.setup_suite_cmd_name;

        this.sandbox_docker_image = args.sandbox_docker_image;

        this.allow_network_access = args.allow_network_access;
        this.deferred = args.deferred;

        this.normal_fdbk_config =   args.normal_fdbk_config;
        this.ultimate_submission_fdbk_config =  args.ultimate_submission_fdbk_config;
        this.past_limit_submission_fdbk_config =    args.past_limit_submission_fdbk_config;
        this.staff_viewer_fdbk_config = args.staff_viewer_fdbk_config;
    }
}
