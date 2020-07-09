import {
    AGTestCase,
    AGTestCaseObserver,
    AGTestCommand,
    AGTestCommandData,
    AGTestCommandObserver,
    AGTestSuite,
    Course,
    ExpectedOutputSource,
    ExpectedReturnCode, NewAGTestCaseData,
    Project,
    StdinSource,
    ValueFeedbackLevel,
} from "..";

import {
    do_editable_fields_test,
    global_setup,
    make_superuser,
    rand_bool,
    reset_db,
    run_in_django_shell,
    sleep
} from "./utils";


beforeAll(() => {
    global_setup();
});

describe('AGTestCase ctor tests', () => {
    test('Construct AGTestCase', () => {
        let ag_test_commnad_fdbk = {
            visible: true,
            return_code_fdbk_level: ValueFeedbackLevel.correct_or_incorrect,
            stdout_fdbk_level: ValueFeedbackLevel.no_feedback,
            stderr_fdbk_level: ValueFeedbackLevel.expected_and_actual,
            show_points: true,
            show_actual_return_code: false,
            show_actual_stdout: true,
            show_actual_stderr: false,
            show_whether_timed_out: true,
        };

        let now = (new Date()).toISOString();
        let ag_test_commands: AGTestCommandData[] = [
            // Should work with AGTestCommandData and AGTestCommand
            {
                pk: 4,
                name: 'cmdy',

                ag_test_case: 6,
                last_modified: now,

                cmd: 'voop',

                stdin_source: StdinSource.instructor_file,
                stdin_text: '',
                stdin_instructor_file: null,

                expected_return_code: ExpectedReturnCode.nonzero,

                expected_stdout_source: ExpectedOutputSource.none,
                expected_stdout_text: '',
                expected_stdout_instructor_file: null,

                expected_stderr_source: ExpectedOutputSource.text,
                expected_stderr_text: '',
                expected_stderr_instructor_file: null,

                ignore_case: true,
                ignore_whitespace: false,
                ignore_whitespace_changes: false,
                ignore_blank_lines: true,

                points_for_correct_return_code: 1,

                points_for_correct_stdout: 3,
                points_for_correct_stderr: 2,

                deduction_for_wrong_return_code: -1,
                deduction_for_wrong_stdout: -3,
                deduction_for_wrong_stderr: -2,

                normal_fdbk_config: ag_test_commnad_fdbk,
                first_failed_test_normal_fdbk_config: ag_test_commnad_fdbk,
                ultimate_submission_fdbk_config: ag_test_commnad_fdbk,
                past_limit_submission_fdbk_config: ag_test_commnad_fdbk,
                staff_viewer_fdbk_config: ag_test_commnad_fdbk,

                time_limit: 10,
                use_virtual_memory_limit: false,
                virtual_memory_limit: 10000,
                block_process_spawn: true,
            },
            // Should work with AGTestCommandData and AGTestCommand
            new AGTestCommand({
                pk: 4,
                name: 'cmdy',

                ag_test_case: 6,
                last_modified: now,

                cmd: 'voop',

                stdin_source: StdinSource.instructor_file,
                stdin_text: '',
                stdin_instructor_file: null,

                expected_return_code: ExpectedReturnCode.zero,

                expected_stdout_source: ExpectedOutputSource.none,
                expected_stdout_text: '',
                expected_stdout_instructor_file: null,

                expected_stderr_source: ExpectedOutputSource.text,
                expected_stderr_text: '',
                expected_stderr_instructor_file: null,

                ignore_case: true,
                ignore_whitespace: false,
                ignore_whitespace_changes: false,
                ignore_blank_lines: true,

                points_for_correct_return_code: 3,

                points_for_correct_stdout: 2,
                points_for_correct_stderr: 1,

                deduction_for_wrong_return_code: -6,
                deduction_for_wrong_stdout: -4,
                deduction_for_wrong_stderr: -5,

                normal_fdbk_config: ag_test_commnad_fdbk,
                first_failed_test_normal_fdbk_config: ag_test_commnad_fdbk,
                ultimate_submission_fdbk_config: ag_test_commnad_fdbk,
                past_limit_submission_fdbk_config: ag_test_commnad_fdbk,
                staff_viewer_fdbk_config: ag_test_commnad_fdbk,

                time_limit: 10,
                use_virtual_memory_limit: true,
                virtual_memory_limit: 500000,
                block_process_spawn: false,
            })
        ];

        let normal_fdbk = {
            visible: true,
            show_individual_commands: true,
        };
        let ultimate_submission_fdbk = {
            visible: true,
            show_individual_commands: false,
        };
        let past_limit_submission_fdbk = {
            visible: false,
            show_individual_commands: true,
        };
        let staff_viewer_fdbk = {
            visible: false,
            show_individual_commands: false,
        };
        let ag_test_case = new AGTestCase({
            pk: 11,
            name: 'A case',
            ag_test_suite: 22,
            normal_fdbk_config: normal_fdbk,
            ultimate_submission_fdbk_config: ultimate_submission_fdbk,
            past_limit_submission_fdbk_config: past_limit_submission_fdbk,
            staff_viewer_fdbk_config: staff_viewer_fdbk,

            ag_test_commands: ag_test_commands,

            last_modified: now
        });

        expect(ag_test_case.pk).toEqual(11);
        expect(ag_test_case.name).toEqual('A case');
        expect(ag_test_case.ag_test_suite).toEqual(22);
        expect(ag_test_case.normal_fdbk_config).toEqual(normal_fdbk);
        expect(ag_test_case.ultimate_submission_fdbk_config).toEqual(ultimate_submission_fdbk);
        expect(ag_test_case.past_limit_submission_fdbk_config).toEqual(past_limit_submission_fdbk);
        expect(ag_test_case.staff_viewer_fdbk_config).toEqual(staff_viewer_fdbk);
        expect(ag_test_case.last_modified).toEqual(now);

        expect(ag_test_case.ag_test_commands).toEqual(
            [new AGTestCommand(ag_test_commands[0]), ag_test_commands[1]]);
    });
});

class TestObserver implements AGTestCaseObserver {
    ag_test_case: AGTestCase | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    order: number[] | null = null;

    update_ag_test_case_changed(ag_test_case: AGTestCase): void {
        this.changed_count += 1;
        this.ag_test_case = ag_test_case;
    }

    update_ag_test_case_created(ag_test_case: AGTestCase): void {
        this.created_count += 1;
        this.ag_test_case = ag_test_case;
    }

    update_ag_test_case_deleted(ag_test_case: AGTestCase): void {
        this.deleted_count += 1;
        this.ag_test_case = null;
    }

    update_ag_test_cases_order_changed(ag_test_suite_pk: number,
                                       ag_test_case_order: number[]): void {
        this.order = ag_test_case_order;
    }
}

class CopyTestCaseObserver implements AGTestCaseObserver, AGTestCommandObserver {
    created_count = 0;
    ag_test_case: AGTestCase | null = null;

    update_ag_test_case_created(ag_test_case: AGTestCase): void {
        this.created_count += 1;
        // Make a deep copy so that we can make sure that the commands have
        // been copied before this method is called.
        this.ag_test_case = new AGTestCase(JSON.parse(JSON.stringify(ag_test_case)));
    }

    update_ag_test_case_changed(ag_test_case: AGTestCase): void {
    }

    update_ag_test_case_deleted(ag_test_case: AGTestCase): void {
    }

    update_ag_test_cases_order_changed(
        ag_test_suite_pk: number, ag_test_case_order: number[]): void {
    }

    update_ag_test_command_created(ag_test_command: AGTestCommand): void {
        fail('Copying a test case should not call update_ag_test_command_created');
    }

    update_ag_test_command_changed(ag_test_command: AGTestCommand): void {
    }

    update_ag_test_command_deleted(ag_test_command: AGTestCommand): void {
    }

    update_ag_test_commands_order_changed(
        ag_test_case_pk: number, ag_test_command_order: number[]): void {
    }
}

function make_random_fdbk_config() {
    return {
        visible: rand_bool(),
        show_individual_commands: rand_bool(),
    };
}

describe('AGTestCase API tests', () => {
    let ag_test_suite: AGTestSuite;
    let observer: TestObserver;

    beforeEach(async () => {
        reset_db();
        make_superuser();
        let course = await Course.create({name: 'Coursey'});
        let project = await Project.create(course.pk, {name: 'Projy'});
        ag_test_suite = await AGTestSuite.create(project.pk, {name: 'Suitey'});

        let make_cases = `
from autograder.core.models import AGTestCase
AGTestCase.objects.validate_and_create(ag_test_suite=${ag_test_suite.pk}, name='Case1')
AGTestCase.objects.validate_and_create(ag_test_suite=${ag_test_suite.pk}, name='Case2')
        `;
        run_in_django_shell(make_cases);

        observer = new TestObserver();
        AGTestCase.subscribe(observer);
    });

    test('Get AG test cases from suite', async () => {
        let cases = await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk);
        expect(cases[0].name).toEqual('Case1');
        expect(cases[1].name).toEqual('Case2');
    });

    test('Get AG test cases from suite none exist', async () => {
        let delete_cases = `
from autograder.core.models import AGTestCase
AGTestCase.objects.all().delete()
        `;
        run_in_django_shell(delete_cases);

        let cases = await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk);
        expect(cases).toEqual([]);
    });

    test('Get AG test case by pk', async () => {
        let cases = await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk);
        let ag_test_case = await AGTestCase.get_by_pk(cases[0].pk);
        expect(ag_test_case.name).toEqual('Case1');
    });

    test('Create AG test case all params', async () => {
        let normal_fdbk = make_random_fdbk_config();
        let ultimate_submission_fdbk = make_random_fdbk_config();
        let past_limit_submission_fdbk = make_random_fdbk_config();
        let staff_viewer_fdbk = make_random_fdbk_config();

        let ag_test_case = await AGTestCase.create(
            ag_test_suite.pk,
            new NewAGTestCaseData({
                name: 'A case',
                normal_fdbk_config: normal_fdbk,
                ultimate_submission_fdbk_config: ultimate_submission_fdbk,
                past_limit_submission_fdbk_config: past_limit_submission_fdbk,
                staff_viewer_fdbk_config: staff_viewer_fdbk,
            })
        );

        expect(ag_test_case.name).toEqual('A case');
        expect(ag_test_case.normal_fdbk_config).toEqual(normal_fdbk);
        expect(ag_test_case.ultimate_submission_fdbk_config).toEqual(ultimate_submission_fdbk);
        expect(ag_test_case.past_limit_submission_fdbk_config).toEqual(past_limit_submission_fdbk);
        expect(ag_test_case.staff_viewer_fdbk_config).toEqual(staff_viewer_fdbk);

        expect(ag_test_case.ag_test_suite).toEqual(ag_test_suite.pk);
        expect(ag_test_case.ag_test_commands).toEqual([]);

        expect(observer.ag_test_case).toEqual(ag_test_case);
        expect(observer.created_count).toEqual(1);
    });

    test('Create AG test case only required params', async () => {
        let ag_test_case = await AGTestCase.create(ag_test_suite.pk, {name: 'New Case'});
        expect(ag_test_case.name).toEqual('New Case');

        let cases = await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk);
        expect(cases.length).toEqual(3);
    });

    test('Copy AG test case', async () => {
        let ag_test_case = (await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk))[0];
        await AGTestCommand.create(ag_test_case.pk, {name: 'cmd1', cmd: 'cmd1'});
        await AGTestCommand.create(ag_test_case.pk, {name: 'cmd2', cmd: 'cmd2'});

        await ag_test_case.refresh();
        expect(ag_test_case.ag_test_commands.length).toEqual(2);

        let copy_observer = new CopyTestCaseObserver();
        AGTestCase.subscribe(copy_observer);
        AGTestCommand.subscribe(copy_observer);

        let copied = await ag_test_case.copy('Copied');

        expect(copied.pk).not.toEqual(ag_test_case.pk);
        expect(copied.name).toEqual('Copied');
        expect(copied.ag_test_commands.length).toEqual(2);
        expect(copied.ag_test_commands[0].pk).not.toEqual(ag_test_case.ag_test_commands[0].pk);
        expect(copied.ag_test_commands[0].name).toEqual(ag_test_case.ag_test_commands[0].name);
        expect(copied.ag_test_commands[1].pk).not.toEqual(ag_test_case.ag_test_commands[1].pk);
        expect(copied.ag_test_commands[1].name).toEqual(ag_test_case.ag_test_commands[1].name);

        expect(copy_observer.ag_test_case).toEqual(copied);
        expect(copy_observer.created_count).toEqual(1);
    });

    test('Save AG test case', async () => {
        let ag_test_case = (await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk))[0];
        ag_test_case.name = 'Such Rename';
        await ag_test_case.save();
        expect(ag_test_case.name).toEqual('Such Rename');

        let reloaded = await AGTestCase.get_by_pk(ag_test_case.pk);
        expect(reloaded.name).toEqual('Such Rename');

        expect(observer.ag_test_case).toEqual(ag_test_case);
        expect(observer.changed_count).toEqual(1);
    });

    test('Check editable fields', async () => {
        do_editable_fields_test(AGTestCase, 'AGTestCase');
    });

    test('Refresh AG test case', async () => {
        let ag_test_case = (await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk))[0];

        await ag_test_case.refresh();
        expect(observer.changed_count).toEqual(0);

        await sleep(1);

        let rename_case = `
from autograder.core.models import AGTestCase
AGTestCase.objects.get(pk=${ag_test_case.pk}).validate_and_update(name='Renamed')
        `;
        run_in_django_shell(rename_case);

        await ag_test_case.refresh();
        expect(ag_test_case.name).toEqual('Renamed');

        expect(observer.ag_test_case).toEqual(ag_test_case);
        expect(observer.changed_count).toEqual(1);
    });

    test('Delete AG test case', async () => {
        let cases = await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk);
        expect(cases.length).toEqual(2);

        await cases[0].delete();

        cases = await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk);
        expect(cases.length).toEqual(1);
        expect(observer.deleted_count).toEqual(1);
    });

    test('Unsubscribe', async () => {
        let ag_test_case = (await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk))[0];

        await ag_test_case.save();
        expect(observer.changed_count).toEqual(1);

        AGTestCase.unsubscribe(observer);

        await ag_test_case.save();
        expect(observer.changed_count).toEqual(1);
    });

    test('Get AG test case order', async () => {
        let cases = await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk);

        let order = await AGTestCase.get_order(ag_test_suite.pk);
        expect(order).toEqual([cases[0].pk, cases[1].pk]);
    });

    test('Update AG test case order', async () => {
        let cases = await AGTestCase.get_all_from_ag_test_suite(ag_test_suite.pk);
        await AGTestCase.update_order(ag_test_suite.pk, [cases[1].pk, cases[0].pk]);

        let order = await AGTestCase.get_order(ag_test_suite.pk);
        expect(order).toEqual([cases[1].pk, cases[0].pk]);
    });
});
