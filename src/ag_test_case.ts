import { AGTestCommand, AGTestCommandData, NewAGTestCommandData } from "./ag_test_command";
import { Deletable, ID, SaveableAPIObject } from "./base";
import { HttpClient } from "./http_client";
import { filter_keys, safe_assign } from "./utils";

class AGTestCaseCoreData {
    pk: ID;
    name: string;
    ag_test_suite: ID;

    staff_description: string;
    student_description: string;

    normal_fdbk_config: AGTestCaseFeedbackConfig;
    ultimate_submission_fdbk_config: AGTestCaseFeedbackConfig;
    past_limit_submission_fdbk_config: AGTestCaseFeedbackConfig;
    staff_viewer_fdbk_config: AGTestCaseFeedbackConfig;

    last_modified: string;

    constructor(args: AGTestCaseCoreData) {
        this.pk = args.pk;
        this.name = args.name;
        this.ag_test_suite = args.ag_test_suite;

        this.staff_description = args.staff_description;
        this.student_description = args.student_description;

        this.normal_fdbk_config = args.normal_fdbk_config;
        this.ultimate_submission_fdbk_config = args.ultimate_submission_fdbk_config;
        this.past_limit_submission_fdbk_config = args.past_limit_submission_fdbk_config;
        this.staff_viewer_fdbk_config = args.staff_viewer_fdbk_config;

        this.last_modified = args.last_modified;
    }
}

interface AGTestCaseCtorArgs extends AGTestCaseCoreData {
    ag_test_commands: AGTestCommandData[];
}

export interface AGTestCaseData extends AGTestCaseCtorArgs {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    _ag_test_case_data_brand: unknown;
}

export interface AGTestCaseObserver {
    update_ag_test_case_created(ag_test_case: AGTestCase): void;
    update_ag_test_case_changed(ag_test_case: AGTestCase): void;
    update_ag_test_case_deleted(ag_test_case: AGTestCase): void;
    update_ag_test_cases_order_changed(ag_test_suite_pk: number,
                                       ag_test_case_order: number[]): void;
}

export class AGTestCase extends AGTestCaseCoreData implements SaveableAPIObject, Deletable {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    private _ag_test_case_brand: unknown;

    ag_test_commands: AGTestCommand[];

    constructor(args: AGTestCaseCtorArgs) {
        super(args);
        this.ag_test_commands = args.ag_test_commands.map(
            (data) => new AGTestCommand(data));
    }

    private static _subscribers = new Set<AGTestCaseObserver>();

    static subscribe(observer: AGTestCaseObserver) {
        AGTestCase._subscribers.add(observer);
    }

    static unsubscribe(observer: AGTestCaseObserver) {
        AGTestCase._subscribers.delete(observer);
    }

    static async get_all_from_ag_test_suite(ag_test_suite_pk: ID): Promise<AGTestCase[]> {
        let response = await HttpClient.get_instance().get<AGTestCaseData[]>(
            `/ag_test_suites/${ag_test_suite_pk}/ag_test_cases/`);
        return response.data.map((data) => new AGTestCase(data));
    }

    static async get_by_pk(ag_test_case_pk: ID): Promise<AGTestCase> {
        let response = await HttpClient.get_instance().get<AGTestCaseData>(
            `/ag_test_cases/${ag_test_case_pk}/`);
        return new AGTestCase(response.data);
    }

    static async create(ag_test_suite_pk: ID, data: NewAGTestCaseData): Promise<AGTestCase> {
        let response = await HttpClient.get_instance().post<AGTestCaseData>(
            `/ag_test_suites/${ag_test_suite_pk}/ag_test_cases/`, data);
        let result = new AGTestCase(response.data);
        AGTestCase.notify_ag_test_case_created(result);
        return result;
    }

    static notify_ag_test_case_created(ag_test_case: AGTestCase) {
        for (let subscriber of AGTestCase._subscribers) {
            subscriber.update_ag_test_case_created(ag_test_case);
        }
    }

    async copy(new_name: string): Promise<AGTestCase> {
        let new_case_response = await HttpClient.get_instance().post<AGTestCaseData>(
            `/ag_test_suites/${this.ag_test_suite}/ag_test_cases/`,
            {
                name: new_name,
                staff_description: this.staff_description,
                student_description: this.student_description,
                normal_fdbk_config: this.normal_fdbk_config,
                ultimate_submission_fdbk_config: this.ultimate_submission_fdbk_config,
                past_limit_submission_fdbk_config: this.past_limit_submission_fdbk_config,
                staff_viewer_fdbk_config: this.staff_viewer_fdbk_config,
            }
        );
        let new_case = new AGTestCase(new_case_response.data);

        for (let cmd of this.ag_test_commands) {
            let cmd_response = await HttpClient.get_instance().post<AGTestCommandData>(
                `/ag_test_cases/${new_case.pk}/ag_test_commands/`,
                <NewAGTestCommandData> filter_keys(cmd, AGTestCommand.EDITABLE_FIELDS)
            );
            new_case.ag_test_commands.push(
                new AGTestCommand(cmd_response.data)
            );
        }

        AGTestCase.notify_ag_test_case_created(new_case);
        return new_case;
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<AGTestCaseData>(
            `/ag_test_cases/${this.pk}/`, filter_keys(this, AGTestCase.EDITABLE_FIELDS));
        safe_assign(this, new AGTestCase(response.data));
        AGTestCase.notify_ag_test_case_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;

        let reloaded = await AGTestCase.get_by_pk(this.pk);
        safe_assign(this, reloaded);

        if (last_modified !== this.last_modified) {
            AGTestCase.notify_ag_test_case_changed(this);
        }
    }

    static notify_ag_test_case_changed(ag_test_case: AGTestCase) {
        for (let subscriber of AGTestCase._subscribers) {
            subscriber.update_ag_test_case_changed(ag_test_case);
        }
    }

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(`/ag_test_cases/${this.pk}/`);
        AGTestCase.notify_ag_test_case_deleted(this);
    }

    static notify_ag_test_case_deleted(ag_test_case: AGTestCase) {
        for (let subscriber of AGTestCase._subscribers) {
            subscriber.update_ag_test_case_deleted(ag_test_case);
        }
    }

    static async get_order(ag_test_suite_pk: ID): Promise<ID[]> {
        let response = await HttpClient.get_instance().get<ID[]>(
            `/ag_test_suites/${ag_test_suite_pk}/ag_test_cases/order/`);
        return response.data;
    }

    static async update_order(ag_test_suite_pk: ID, ag_test_case_order: ID[]): Promise<ID[]> {
        let response = await HttpClient.get_instance().put<ID[]>(
            `/ag_test_suites/${ag_test_suite_pk}/ag_test_cases/order/`, ag_test_case_order);
        AGTestCase.notify_ag_test_case_order_updated(ag_test_suite_pk, response.data);
        return response.data;
    }

    static notify_ag_test_case_order_updated(ag_test_suite_pk: ID, ag_test_case_order: ID[]) {
        for (let subscriber of AGTestCase._subscribers) {
            subscriber.update_ag_test_cases_order_changed(
                ag_test_suite_pk, ag_test_case_order);
        }
    }

    static readonly EDITABLE_FIELDS: ReadonlyArray<(keyof AGTestCase)> = [
        'name',
        'ag_test_suite',  // Editing this changes the suite the test belongs to.
        'staff_description',
        'student_description',
        'normal_fdbk_config',
        'ultimate_submission_fdbk_config',
        'past_limit_submission_fdbk_config',
        'staff_viewer_fdbk_config',
    ];
}

export class NewAGTestCaseData {
    // IMPORTANT!! If you add fields here, update the whitelist in AGTestCase.copy()
    name: string;
    staff_description?: string;
    student_description?: string;
    normal_fdbk_config?: AGTestCaseFeedbackConfig;
    ultimate_submission_fdbk_config?: AGTestCaseFeedbackConfig;
    past_limit_submission_fdbk_config?: AGTestCaseFeedbackConfig;
    staff_viewer_fdbk_config?: AGTestCaseFeedbackConfig;

    constructor(args: NewAGTestCaseData) {
        this.name = args.name;
        this.staff_description = args.staff_description;
        this.student_description = args.student_description;
        this.normal_fdbk_config = args.normal_fdbk_config;
        this.ultimate_submission_fdbk_config = args.ultimate_submission_fdbk_config;
        this.past_limit_submission_fdbk_config = args.past_limit_submission_fdbk_config;
        this.staff_viewer_fdbk_config = args.staff_viewer_fdbk_config;
    }
}

export interface AGTestCaseFeedbackConfig {
    visible: boolean;
    show_individual_commands: boolean;
    show_student_description: boolean;
}
