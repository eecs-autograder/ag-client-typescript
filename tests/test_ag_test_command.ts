import {
    AGTestCase,
    AGTestCommand,
    AGTestCommandObserver, AGTestSuite,
    Course, ExpectedOutputSource, ExpectedReturnCode, InstructorFile,
    Project, StdinSource,
    ValueFeedbackLevel
} from "..";
import { AGTestCommandFeedbackConfig, NewAGTestCommandData } from "../src/ag_test_command";

import {
    global_setup,
    make_superuser,
    rand_bool,
    rand_int,
    reset_db,
    run_in_django_shell, sleep
} from "./utils";

beforeAll(() => {
    global_setup();
});

describe('AGTestCommand ctor tests', () => {
    test('Construct AGTestCommand nullable fields null', () => {
        let now = (new Date()).toISOString();

        let normal_fdbk = make_random_fdbk_config();
        let ultimate_submission_fdbk = make_random_fdbk_config();
        let past_limit_submission_fdbk = make_random_fdbk_config();
        let staff_viewer_fdbk = make_random_fdbk_config();

        let cmd = new AGTestCommand({
            pk: 42,
            name: 'some cmd',

            ag_test_case: 18,
            last_modified: now,

            cmd: 'voop!',

            stdin_source: StdinSource.text,
            stdin_text: 'weee',
            stdin_instructor_file: null,

            expected_return_code: ExpectedReturnCode.zero,

            expected_stdout_source: ExpectedOutputSource.text,
            expected_stdout_text: 'waaa',
            expected_stdout_instructor_file: null,

            expected_stderr_source: ExpectedOutputSource.text,
            expected_stderr_text: 'wuuuu',
            expected_stderr_instructor_file: null,

            ignore_case: true,
            ignore_whitespace: false,
            ignore_whitespace_changes: false,
            ignore_blank_lines: true,

            points_for_correct_return_code: 1,

            points_for_correct_stdout: 2,
            points_for_correct_stderr: 3,

            deduction_for_wrong_return_code: -3,

            deduction_for_wrong_stdout: -1,
            deduction_for_wrong_stderr: -2,

            normal_fdbk_config: normal_fdbk,
            first_failed_test_normal_fdbk_config: null,
            ultimate_submission_fdbk_config: ultimate_submission_fdbk,
            past_limit_submission_fdbk_config: past_limit_submission_fdbk,
            staff_viewer_fdbk_config: staff_viewer_fdbk,

            time_limit: 3,
            use_virtual_memory_limit: true,
            virtual_memory_limit: 40000,
            block_process_spawn: true,
        });

        expect(cmd.pk).toEqual(42);
        expect(cmd.name).toEqual('some cmd');

        expect(cmd.ag_test_case).toEqual(18);
        expect(cmd.last_modified).toEqual(now);

        expect(cmd.cmd).toEqual('voop!');

        expect(cmd.stdin_source).toEqual(StdinSource.text);
        expect(cmd.stdin_text).toEqual('weee');
        expect(cmd.stdin_instructor_file).toEqual(null);

        expect(cmd.expected_return_code).toEqual(ExpectedReturnCode.zero);

        expect(cmd.expected_stdout_source).toEqual(ExpectedOutputSource.text);
        expect(cmd.expected_stdout_text).toEqual('waaa');
        expect(cmd.expected_stdout_instructor_file).toEqual(null);

        expect(cmd.expected_stderr_source).toEqual(ExpectedOutputSource.text);
        expect(cmd.expected_stderr_text).toEqual('wuuuu');
        expect(cmd.expected_stderr_instructor_file).toEqual(null);

        expect(cmd.ignore_case).toEqual(true);
        expect(cmd.ignore_whitespace).toEqual(false);
        expect(cmd.ignore_whitespace_changes).toEqual(false);
        expect(cmd.ignore_blank_lines).toEqual(true);

        expect(cmd.points_for_correct_return_code).toEqual(1);

        expect(cmd.points_for_correct_stdout).toEqual(2);
        expect(cmd.points_for_correct_stderr).toEqual(3);

        expect(cmd.deduction_for_wrong_return_code).toEqual(-3);

        expect(cmd.deduction_for_wrong_stdout).toEqual(-1);
        expect(cmd.deduction_for_wrong_stderr).toEqual(-2);

        expect(cmd.normal_fdbk_config).toEqual(normal_fdbk);
        expect(cmd.first_failed_test_normal_fdbk_config).toEqual(null);
        expect(cmd.ultimate_submission_fdbk_config).toEqual(ultimate_submission_fdbk);
        expect(cmd.past_limit_submission_fdbk_config).toEqual(past_limit_submission_fdbk);
        expect(cmd.staff_viewer_fdbk_config).toEqual(staff_viewer_fdbk);

        expect(cmd.time_limit).toEqual(3);
        expect(cmd.use_virtual_memory_limit).toBe(true);
        expect(cmd.virtual_memory_limit).toEqual(40000);
        expect(cmd.block_process_spawn).toBe(true);
    });

    test('Construct AGTestCommand nullable fields non-null', () => {
        let now = (new Date()).toISOString();

        let normal_fdbk = make_random_fdbk_config();
        let first_failure_fdbk = make_random_fdbk_config();
        let ultimate_submission_fdbk = make_random_fdbk_config();
        let past_limit_submission_fdbk = make_random_fdbk_config();
        let staff_viewer_fdbk = make_random_fdbk_config();

        let stdin_instructor_file = new InstructorFile({
            pk: 4, project: 23, name: 'stdin', size: 100, last_modified: now
        });
        let stdout_instructor_file = new InstructorFile({
            pk: 5, project: 23, name: 'stdout', size: 100, last_modified: now
        });
        let stderr_instructor_file = new InstructorFile({
            pk: 6, project: 23, name: 'stderr', size: 100, last_modified: now
        });

        let cmd = new AGTestCommand({
            pk: 42,
            name: 'some cmd',

            ag_test_case: 18,
            last_modified: now,

            cmd: 'voop!',

            stdin_source: StdinSource.instructor_file,
            stdin_text: '',
            stdin_instructor_file: stdin_instructor_file,

            expected_return_code: ExpectedReturnCode.zero,

            expected_stdout_source: ExpectedOutputSource.instructor_file,
            expected_stdout_text: '',
            expected_stdout_instructor_file: stdout_instructor_file,

            expected_stderr_source: ExpectedOutputSource.instructor_file,
            expected_stderr_text: '',
            expected_stderr_instructor_file: stderr_instructor_file,

            ignore_case: true,
            ignore_whitespace: false,
            ignore_whitespace_changes: false,
            ignore_blank_lines: true,

            points_for_correct_return_code: 1,

            points_for_correct_stdout: 2,
            points_for_correct_stderr: 3,

            deduction_for_wrong_return_code: -3,

            deduction_for_wrong_stdout: -1,
            deduction_for_wrong_stderr: -2,

            normal_fdbk_config: normal_fdbk,
            first_failed_test_normal_fdbk_config: first_failure_fdbk,
            ultimate_submission_fdbk_config: ultimate_submission_fdbk,
            past_limit_submission_fdbk_config: past_limit_submission_fdbk,
            staff_viewer_fdbk_config: staff_viewer_fdbk,

            time_limit: 3,
            use_virtual_memory_limit: true,
            virtual_memory_limit: 40000,
            block_process_spawn: true,
        });

        expect(cmd.stdin_instructor_file).toEqual(stdin_instructor_file);
        expect(cmd.expected_stdout_instructor_file).toEqual(stdout_instructor_file);
        expect(cmd.expected_stderr_instructor_file).toEqual(stderr_instructor_file);
        expect(cmd.first_failed_test_normal_fdbk_config).toEqual(first_failure_fdbk);
    });
});

class TestObserver implements AGTestCommandObserver {
    ag_test_command: AGTestCommand | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    order: number[] | null = null;

    update_ag_test_command_changed(ag_test_command: AGTestCommand): void {
        this.changed_count += 1;
        this.ag_test_command = ag_test_command;
    }

    update_ag_test_command_created(ag_test_command: AGTestCommand): void {
        this.created_count += 1;
        this.ag_test_command = ag_test_command;
    }

    update_ag_test_command_deleted(ag_test_command: AGTestCommand): void {
        this.deleted_count += 1;
        this.ag_test_command = null;
    }

    update_ag_test_commands_order_changed(ag_test_case_pk: number,
                                          ag_test_command_order: number[]): void {
        this.order = ag_test_command_order;
    }
}

function make_random_fdbk_config(): AGTestCommandFeedbackConfig {
    return {
        visible: rand_bool(),
        return_code_fdbk_level: Object.values(ValueFeedbackLevel)[rand_int(2)],
        stdout_fdbk_level: Object.values(ValueFeedbackLevel)[rand_int(2)],
        stderr_fdbk_level: Object.values(ValueFeedbackLevel)[rand_int(2)],
        show_points: rand_bool(),
        show_actual_return_code: rand_bool(),
        show_actual_stdout: rand_bool(),
        show_actual_stderr: rand_bool(),
        show_whether_timed_out: rand_bool(),
    };
}

describe('AGTestCommand API tests', () => {
    let ag_test_case: AGTestCase;
    let observer: TestObserver;

    beforeEach(async () => {
        reset_db();
        make_superuser();
        let course = await Course.create({name: 'Coursey'});
        let project = await Project.create(course.pk, {name: 'Projy'});
        let ag_test_suite = await AGTestSuite.create(project.pk, {name: 'Suitey'});
        ag_test_case = await AGTestCase.create(ag_test_suite.pk, {name: 'Casey'});

        let make_cmds = `
from autograder.core.models import AGTestCommand
AGTestCommand.objects.validate_and_create(
    ag_test_case=${ag_test_case.pk}, name='Cmd1', cmd='run.exe')
AGTestCommand.objects.validate_and_create(
    ag_test_case=${ag_test_case.pk}, name='Cmd2', cmd='run.exe')
        `;
        run_in_django_shell(make_cmds);

        observer = new TestObserver();
        AGTestCommand.subscribe(observer);
   });

    test('Get commands from test case', async () => {
        let cmds = await AGTestCommand.get_all_from_ag_test_case(ag_test_case.pk);
        expect(cmds[0].name).toEqual('Cmd1');
        expect(cmds[1].name).toEqual('Cmd2');
    });

    test('Get commands from test case none exist', async () => {
        let delete_cmds = `
from autograder.core.models import AGTestCommand
AGTestCommand.objects.all().delete()
        `;
        run_in_django_shell(delete_cmds);

        let cmds = await AGTestCommand.get_all_from_ag_test_case(ag_test_case.pk);
        expect(cmds.length).toEqual(0);
    });

    test('Get command by pk', async () => {
        let cmds = await AGTestCommand.get_all_from_ag_test_case(ag_test_case.pk);
        let cmd = await AGTestCommand.get_by_pk(cmds[0].pk);
        expect(cmd.name).toEqual('Cmd1');
    });

    test('Create command all params', async () => {
        let normal_fdbk = make_random_fdbk_config();
        let first_failure_fdbk = make_random_fdbk_config();
        let ultimate_submission_fdbk = make_random_fdbk_config();
        let past_limit_submission_fdbk = make_random_fdbk_config();
        let staff_viewer_fdbk = make_random_fdbk_config();

        let cmd = await AGTestCommand.create(
            ag_test_case.pk,
            new NewAGTestCommandData({
                name: 'some cmd',
                cmd: 'voop!',

                stdin_source: StdinSource.text,
                stdin_text: 'weee',
                stdin_instructor_file: null,

                expected_return_code: ExpectedReturnCode.zero,

                expected_stdout_source: ExpectedOutputSource.text,
                expected_stdout_text: 'waaa',
                expected_stdout_instructor_file: null,

                expected_stderr_source: ExpectedOutputSource.text,
                expected_stderr_text: 'wuuuu',
                expected_stderr_instructor_file: null,

                ignore_case: true,
                ignore_whitespace: false,
                ignore_whitespace_changes: false,
                ignore_blank_lines: true,

                points_for_correct_return_code: 1,

                points_for_correct_stdout: 2,
                points_for_correct_stderr: 3,

                deduction_for_wrong_return_code: -3,

                deduction_for_wrong_stdout: -1,
                deduction_for_wrong_stderr: -2,

                normal_fdbk_config: normal_fdbk,
                first_failed_test_normal_fdbk_config: first_failure_fdbk,
                ultimate_submission_fdbk_config: ultimate_submission_fdbk,
                past_limit_submission_fdbk_config: past_limit_submission_fdbk,
                staff_viewer_fdbk_config: staff_viewer_fdbk,

                time_limit: 3,
                use_virtual_memory_limit: false,
                virtual_memory_limit: 40000,
                block_process_spawn: true,
            })
        );

        expect(cmd.name).toEqual('some cmd');
        expect(cmd.cmd).toEqual('voop!');

        expect(cmd.stdin_source).toEqual(StdinSource.text);
        expect(cmd.stdin_text).toEqual('weee');
        expect(cmd.stdin_instructor_file).toEqual(null);

        expect(cmd.expected_return_code).toEqual(ExpectedReturnCode.zero);

        expect(cmd.expected_stdout_source).toEqual(ExpectedOutputSource.text);
        expect(cmd.expected_stdout_text).toEqual('waaa');
        expect(cmd.expected_stdout_instructor_file).toEqual(null);

        expect(cmd.expected_stderr_source).toEqual(ExpectedOutputSource.text);
        expect(cmd.expected_stderr_text).toEqual('wuuuu');
        expect(cmd.expected_stderr_instructor_file).toEqual(null);

        expect(cmd.ignore_case).toEqual(true);
        expect(cmd.ignore_whitespace).toEqual(false);
        expect(cmd.ignore_whitespace_changes).toEqual(false);
        expect(cmd.ignore_blank_lines).toEqual(true);

        expect(cmd.points_for_correct_return_code).toEqual(1);

        expect(cmd.points_for_correct_stdout).toEqual(2);
        expect(cmd.points_for_correct_stderr).toEqual(3);

        expect(cmd.deduction_for_wrong_return_code).toEqual(-3);

        expect(cmd.deduction_for_wrong_stdout).toEqual(-1);
        expect(cmd.deduction_for_wrong_stderr).toEqual(-2);

        expect(cmd.normal_fdbk_config).toEqual(normal_fdbk);
        expect(cmd.first_failed_test_normal_fdbk_config).toEqual(first_failure_fdbk);
        expect(cmd.ultimate_submission_fdbk_config).toEqual(ultimate_submission_fdbk);
        expect(cmd.past_limit_submission_fdbk_config).toEqual(past_limit_submission_fdbk);
        expect(cmd.staff_viewer_fdbk_config).toEqual(staff_viewer_fdbk);

        expect(cmd.time_limit).toEqual(3);
        expect(cmd.use_virtual_memory_limit).toBe(false);
        expect(cmd.virtual_memory_limit).toEqual(40000);
        expect(cmd.block_process_spawn).toBe(true);

        expect(observer.ag_test_command).toEqual(cmd);
        expect(observer.created_count).toEqual(1);
    });

    test('Create command only required params', async () => {
        let cmd = await AGTestCommand.create(ag_test_case.pk, {
            name: 'moar cmd',
            cmd: 'voop!',
        });

        expect(cmd.name).toEqual('moar cmd');
        expect(cmd.cmd).toEqual('voop!');
    });

    test('Save command', async () => {
        let cmd = (await AGTestCommand.get_all_from_ag_test_case(ag_test_case.pk))[0];
        cmd.name = 'Renamey';
        await cmd.save();
        expect(cmd.name).toEqual('Renamey');

        let reloaded = await AGTestCommand.get_by_pk(cmd.pk);
        expect(reloaded.name).toEqual('Renamey');

        expect(observer.ag_test_command).toEqual(reloaded);
        expect(observer.changed_count).toEqual(1);
    });

    test('Refresh command', async () => {
        let cmd = (await AGTestCommand.get_all_from_ag_test_case(ag_test_case.pk))[0];

        await cmd.refresh();
        expect(observer.changed_count).toEqual(0);

        await sleep(1);

        let rename_cmd = `
from autograder.core.models import AGTestCommand
AGTestCommand.objects.get(pk=${cmd.pk}).validate_and_update(name='Renamed')
        `;
        run_in_django_shell(rename_cmd);

        await cmd.refresh();
        expect(cmd.name).toEqual('Renamed');

        expect(observer.ag_test_command).toEqual(cmd);
        expect(observer.changed_count).toEqual(1);
    });

    test('Delete command', async () => {
        let cmds = await AGTestCommand.get_all_from_ag_test_case(ag_test_case.pk);
        expect(cmds.length).toEqual(2);

        await cmds[0].delete();

        cmds = await AGTestCommand.get_all_from_ag_test_case(ag_test_case.pk);
        expect(cmds.length).toEqual(1);
        expect(observer.deleted_count).toEqual(1);
    });

    test('Unsubscribe', async () => {
        let cmd = (await AGTestCommand.get_all_from_ag_test_case(ag_test_case.pk))[0];

        await cmd.save();
        expect(observer.changed_count).toEqual(1);

        AGTestCommand.unsubscribe(observer);

        await cmd.save();
        expect(observer.changed_count).toEqual(1);
    });

    test('Get command order', async () => {
        let cmds = await AGTestCommand.get_all_from_ag_test_case(ag_test_case.pk);

        let order = await AGTestCommand.get_order(ag_test_case.pk);
        expect(order).toEqual([cmds[0].pk, cmds[1].pk]);
    });

    test('Update command order', async () => {
        let cmds = await AGTestCommand.get_all_from_ag_test_case(ag_test_case.pk);
        await AGTestCommand.update_order(ag_test_case.pk, [cmds[1].pk, cmds[0].pk]);

        let order = await AGTestCommand.get_order(ag_test_case.pk);
        expect(order).toEqual([cmds[1].pk, cmds[0].pk]);
    });
});
