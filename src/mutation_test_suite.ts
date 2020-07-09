import { AGCommand } from "./ag_command";
import { Deletable, ID, SaveableAPIObject } from "./base";
import { ExpectedStudentFile, ExpectedStudentFileData } from "./expected_student_file";
import { HttpClient } from "./http_client";
import { InstructorFile, InstructorFileData } from "./instructor_file";
import { SandboxDockerImageData } from "./sandbox_docker_image";
import { filter_keys, safe_assign } from "./utils";

export class MutationTestSuiteCoreData {
    pk: ID;
    name: string;
    project: ID;
    last_modified: string;

    read_only_instructor_files: boolean;

    buggy_impl_names: string[];

    use_setup_command: boolean;
    setup_command: AGCommand;

    get_student_test_names_command: AGCommand;
    max_num_student_tests: number;

    student_test_validity_check_command: AGCommand;
    grade_buggy_impl_command: AGCommand;

    points_per_exposed_bug: string;
    max_points: number | null;
    deferred: boolean;
    sandbox_docker_image: SandboxDockerImageData;
    allow_network_access: boolean;

    normal_fdbk_config: MutationTestSuiteFeedbackConfig;
    ultimate_submission_fdbk_config: MutationTestSuiteFeedbackConfig;
    past_limit_submission_fdbk_config: MutationTestSuiteFeedbackConfig;
    staff_viewer_fdbk_config: MutationTestSuiteFeedbackConfig;

    constructor(args: MutationTestSuiteCoreData) {
        this.pk = args.pk;
        this.name = args.name;
        this.project = args.project;
        this.last_modified = args.last_modified;

        this.read_only_instructor_files = args.read_only_instructor_files;

        this.buggy_impl_names = args.buggy_impl_names;

        this.use_setup_command = args.use_setup_command;
        this.setup_command = args.setup_command;

        this.get_student_test_names_command = args.get_student_test_names_command;
        this.max_num_student_tests = args.max_num_student_tests;

        this.student_test_validity_check_command = args.student_test_validity_check_command;
        this.grade_buggy_impl_command = args.grade_buggy_impl_command;

        this.points_per_exposed_bug = args.points_per_exposed_bug;
        this.max_points = args.max_points;
        this.deferred = args.deferred;
        this.sandbox_docker_image = args.sandbox_docker_image;
        this.allow_network_access = args.allow_network_access;

        this.normal_fdbk_config = args.normal_fdbk_config;
        this.ultimate_submission_fdbk_config = args.ultimate_submission_fdbk_config;
        this.past_limit_submission_fdbk_config = args.past_limit_submission_fdbk_config;
        this.staff_viewer_fdbk_config = args.staff_viewer_fdbk_config;
    }
}

interface MutationTestSuiteCtorArgs extends MutationTestSuiteCoreData {
    instructor_files_needed: InstructorFileData[];
    student_files_needed: ExpectedStudentFileData[];
}

export interface MutationTestSuiteData extends MutationTestSuiteCtorArgs {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    _mutation_test_suite_data_brand: unknown;
}

export interface MutationTestSuiteObserver {
    update_mutation_test_suite_created(mutation_test_suite: MutationTestSuite): void;
    update_mutation_test_suite_changed(mutation_test_suite: MutationTestSuite): void;
    update_mutation_test_suite_deleted(mutation_test_suite: MutationTestSuite): void;
    update_mutation_test_suites_order_changed(project_pk: ID,
                                              mutation_test_suite_order: ID[]): void;
}

export class MutationTestSuite extends MutationTestSuiteCoreData implements SaveableAPIObject,
                                                                            Deletable {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    private _mutation_test_suite_brand: unknown;

    instructor_files_needed: InstructorFile[];
    student_files_needed: ExpectedStudentFile[];

    constructor(args: MutationTestSuiteCtorArgs) {
        super(args);
        this.instructor_files_needed = args.instructor_files_needed.map(
            (data) => new InstructorFile(data));
        this.student_files_needed = args.student_files_needed.map(
            (data) => new ExpectedStudentFile(data));
    }

    private static _subscribers = new Set<MutationTestSuiteObserver>();

    static subscribe(observer: MutationTestSuiteObserver) {
        MutationTestSuite._subscribers.add(observer);
    }

    static unsubscribe(observer: MutationTestSuiteObserver) {
        MutationTestSuite._subscribers.delete(observer);
    }

    static async get_all_from_project(project_pk: ID): Promise<MutationTestSuite[]> {
        let response = await HttpClient.get_instance().get<MutationTestSuiteData[]>(
            `/projects/${project_pk}/mutation_test_suites/`);
        return response.data.map(suite_data => new MutationTestSuite(suite_data));
    }

    static async get_by_pk(mutation_test_suite_pk: ID): Promise<MutationTestSuite> {
        let response = await HttpClient.get_instance().get<MutationTestSuiteData>(
            `/mutation_test_suites/${mutation_test_suite_pk}/`);
        return new MutationTestSuite(response.data);
    }

    static async create(project_pk: ID,
                        data: NewMutationTestSuiteData): Promise<MutationTestSuite> {
        let response = await HttpClient.get_instance().post<MutationTestSuiteData>(
            `/projects/${project_pk}/mutation_test_suites/`, data);
        let result = new MutationTestSuite(response.data);
        MutationTestSuite.notify_mutation_test_suite_created(result);
        return result;
    }

    static notify_mutation_test_suite_created(mutation_test_suite: MutationTestSuite) {
        for (let subscriber of MutationTestSuite._subscribers) {
            subscriber.update_mutation_test_suite_created(mutation_test_suite);
        }
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<MutationTestSuiteData>(
            `/mutation_test_suites/${this.pk}/`,
            filter_keys(this, MutationTestSuite.EDITABLE_FIELDS));
        safe_assign(this, new MutationTestSuite(response.data));
        MutationTestSuite.notify_mutation_test_suite_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;

        let reloaded = await MutationTestSuite.get_by_pk(this.pk);
        safe_assign(this, reloaded);

        if (last_modified !== this.last_modified) {
            MutationTestSuite.notify_mutation_test_suite_changed(this);
        }
    }

    static notify_mutation_test_suite_changed(mutation_test_suite: MutationTestSuite) {
        for (let subscriber of MutationTestSuite._subscribers) {
            subscriber.update_mutation_test_suite_changed(mutation_test_suite);
        }
    }

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(`/mutation_test_suites/${this.pk}/`);
        MutationTestSuite.notify_mutation_test_suite_deleted(this);
    }

    static notify_mutation_test_suite_deleted(mutation_test_suite: MutationTestSuite) {
        for (let subscriber of MutationTestSuite._subscribers) {
            subscriber.update_mutation_test_suite_deleted(mutation_test_suite);
        }
    }

    static async get_order(project_pk: ID): Promise<ID[]> {
        let response = await HttpClient.get_instance().get<ID[]>(
            `/projects/${project_pk}/mutation_test_suites/order/`);
        return response.data;
    }

    static async update_order(project_pk: ID, ag_test_suite_order: ID[]): Promise<ID[]> {
        let response = await HttpClient.get_instance().put<ID[]>(
            `/projects/${project_pk}/mutation_test_suites/order/`, ag_test_suite_order);

        MutationTestSuite.notify_mutation_test_suite_order_updated(project_pk, response.data);
        return response.data;
    }

    static notify_mutation_test_suite_order_updated(project_pk: ID,
                                                    mutation_test_suite_order: ID[]) {
        for (let subscriber of MutationTestSuite._subscribers) {
            subscriber.update_mutation_test_suites_order_changed(
                project_pk, mutation_test_suite_order);
        }
    }

    static readonly EDITABLE_FIELDS: ReadonlyArray<(keyof MutationTestSuite)> = [
        'name',

        'instructor_files_needed',
        'read_only_instructor_files',
        'student_files_needed',

        'buggy_impl_names',

        'use_setup_command',
        'setup_command',

        'get_student_test_names_command',
        'max_num_student_tests',

        'student_test_validity_check_command',
        'grade_buggy_impl_command',

        'points_per_exposed_bug',
        'max_points',
        'deferred',
        'sandbox_docker_image',
        'allow_network_access',

        'normal_fdbk_config',
        'ultimate_submission_fdbk_config',
        'past_limit_submission_fdbk_config',
        'staff_viewer_fdbk_config',
    ];
}

export interface MutationTestSuiteFeedbackConfig {
    visible: boolean;

    show_setup_return_code: boolean;
    show_setup_stdout: boolean;
    show_setup_stderr: boolean;

    show_invalid_test_names: boolean;
    show_points: boolean;
    bugs_exposed_fdbk_level: BugsExposedFeedbackLevel;

    show_get_test_names_return_code: boolean;
    show_get_test_names_stdout: boolean;
    show_get_test_names_stderr: boolean;

    show_validity_check_stdout: boolean;
    show_validity_check_stderr: boolean;

    show_grade_buggy_impls_stdout: boolean;
    show_grade_buggy_impls_stderr: boolean;
}

export enum BugsExposedFeedbackLevel {
    no_feedback = 'no_feedback',
    num_bugs_exposed = 'num_bugs_exposed',
    exposed_bug_names = 'exposed_bug_names',
    all_bug_names = 'all_bug_names'
}

export class NewMutationTestSuiteData {
    name: string;

    instructor_files_needed?: InstructorFile[];
    student_files_needed?: ExpectedStudentFile[];

    read_only_instructor_files?: boolean;

    buggy_impl_names?: string[];

    use_setup_command?: boolean;
    setup_command?: AGCommand;

    get_student_test_names_command?: AGCommand;
    max_num_student_tests?: number;

    student_test_validity_check_command?: AGCommand;
    grade_buggy_impl_command?: AGCommand;

    points_per_exposed_bug?: string;
    max_points?: number | null;
    deferred?: boolean;
    sandbox_docker_image?: SandboxDockerImageData;
    allow_network_access?: boolean;

    normal_fdbk_config?: MutationTestSuiteFeedbackConfig;
    ultimate_submission_fdbk_config?: MutationTestSuiteFeedbackConfig;
    past_limit_submission_fdbk_config?: MutationTestSuiteFeedbackConfig;
    staff_viewer_fdbk_config?: MutationTestSuiteFeedbackConfig;

    constructor(args: NewMutationTestSuiteData) {
        this.name = args.name;

        this.instructor_files_needed = args.instructor_files_needed;
        this.student_files_needed = args.student_files_needed;

        this.read_only_instructor_files = args.read_only_instructor_files;

        this.buggy_impl_names = args.buggy_impl_names;

        this.use_setup_command = args.use_setup_command;
        this.setup_command = args.setup_command;

        this.get_student_test_names_command = args.get_student_test_names_command;
        this.max_num_student_tests = args.max_num_student_tests;

        this.student_test_validity_check_command = args.student_test_validity_check_command;
        this.grade_buggy_impl_command = args.grade_buggy_impl_command;

        this.points_per_exposed_bug = args.points_per_exposed_bug;
        this.max_points = args.max_points;
        this.deferred = args.deferred;
        this.sandbox_docker_image = args.sandbox_docker_image;
        this.allow_network_access = args.allow_network_access;

        this.normal_fdbk_config = args.normal_fdbk_config;
        this.ultimate_submission_fdbk_config = args.ultimate_submission_fdbk_config;
        this.past_limit_submission_fdbk_config = args.past_limit_submission_fdbk_config;
        this.staff_viewer_fdbk_config = args.staff_viewer_fdbk_config;
    }
}
