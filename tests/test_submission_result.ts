import * as cli from '..';
import { ID } from '../src/base';

import { global_setup, make_superuser, reset_db, run_in_django_shell } from "./utils";

let course: cli.Course;
let project: cli.Project;
let submission_pk: ID;
let ag_test_suite: cli.AGTestSuite;
let ag_test_case: cli.AGTestCase;
let ag_test_cmd: cli.AGTestCommand;
let mutation_test_suite: cli.MutationTestSuite;

let ag_test_suite_result_pk: ID;
let ag_test_case_result_pk: ID;
let ag_test_cmd_result_pk: ID;
let mutation_test_suite_result_pk: ID;

// Note: Make sure all of these have unique lengths
let ag_test_suite_setup_stdout = 'a'.repeat(5);
let ag_test_suite_setup_stderr = 'b'.repeat(6);

let ag_test_cmd_expected_stdout = 'c'.repeat(7);
let ag_test_cmd_actual_stdout = 'd'.repeat(8);

let ag_test_cmd_expected_stderr = 'e'.repeat(9);
let ag_test_cmd_actual_stderr = 'f'.repeat(10);

let mutation_suite_setup_result_stdout = 'g'.repeat(11);
let mutation_suite_setup_result_stderr = 'h'.repeat(12);

let get_test_names_stdout = 'i'.repeat(13);
let get_test_names_stderr = 'j'.repeat(14);

let validity_check_stdout = 'k'.repeat(15);
let validity_check_stderr = 'l'.repeat(16);

let grade_buggy_impls_stdout = 'm'.repeat(17);
let grade_buggy_impls_stderr = 'n'.repeat(18);


beforeAll(async () => {
    global_setup();

    reset_db();
    make_superuser();

    course = await cli.Course.create({name: 'Course'});
    project = await cli.Project.create(course.pk, {name: 'Project'});
    ag_test_suite = await cli.AGTestSuite.create(project.pk, {
        name: 'AG Test Suite',
        setup_suite_cmd: './setup.sh',
        setup_suite_cmd_name: 'Compile ag suite',

        normal_fdbk_config: {
            visible: true,
            show_individual_tests: true,

            show_setup_return_code: false,
            show_setup_stderr: false,
            show_setup_stdout: false,
            show_setup_timed_out: false,
        }
    });
    ag_test_case = await cli.AGTestCase.create(ag_test_suite.pk, {
        name: 'AG Test Case',
    });
    ag_test_cmd = await cli.AGTestCommand.create(ag_test_case.pk, {
        name: 'AG Test Cmd',
        cmd: './run.sh',
        expected_return_code: cli.ExpectedReturnCode.zero,
        expected_stdout_source: cli.ExpectedOutputSource.text,
        expected_stdout_text: ag_test_cmd_expected_stdout,
        expected_stderr_source: cli.ExpectedOutputSource.text,
        expected_stderr_text: ag_test_cmd_expected_stderr,

        points_for_correct_return_code: 1,
        points_for_correct_stdout: 2,
        points_for_correct_stderr: 4,

        normal_fdbk_config: {
            visible: true,
            return_code_fdbk_level: cli.ValueFeedbackLevel.no_feedback,
            show_actual_return_code: false,
            stdout_fdbk_level: cli.ValueFeedbackLevel.no_feedback,
            show_actual_stdout: false,
            stderr_fdbk_level: cli.ValueFeedbackLevel.no_feedback,
            show_actual_stderr: false,
            show_points: false,
            show_whether_timed_out: false,
        }
    });

    mutation_test_suite = await cli.MutationTestSuite.create(project.pk, {
        name: 'Mutation test suite',
        buggy_impl_names: ['bug1', 'bug2', 'bug3'],
        points_per_exposed_bug: '1',
        use_setup_command: true,
        setup_command: {
            name: '',
            cmd: './setup.sh',
            process_spawn_limit: 0,
            stack_size_limit: 10000,
            time_limit: 10,
            use_virtual_memory_limit: true,
            virtual_memory_limit: 500000000,
            block_process_spawn: true,
        },

        normal_fdbk_config: {
            visible: true,
            bugs_exposed_fdbk_level: cli.BugsExposedFeedbackLevel.no_feedback,
            show_get_test_names_return_code: false,
            show_get_test_names_stderr: false,
            show_get_test_names_stdout: false,
            show_grade_buggy_impls_stderr: false,
            show_grade_buggy_impls_stdout: false,
            show_invalid_test_names: false,
            show_points: false,
            show_setup_return_code: false,
            show_setup_stderr: false,
            show_setup_stdout: false,
            show_validity_check_stderr: false,
            show_validity_check_stdout: false,
        }
    });

    let group = await cli.Group.create_solo_group(project.pk);

    let make_submission = `
from autograder.core.models import Group, Submission
group = Group.objects.get(pk=${group.pk})
submission = Submission.objects.validate_and_create(submitted_files=[], group=group)
submission.status = Submission.GradingStatus.finished_grading
submission.save()

print(submission.pk)
    `;
    let result = run_in_django_shell(make_submission);
    submission_pk = parseInt(result.stdout, 10);

    let make_ag_test_suite_result = `
from autograder.core.models import AGTestSuiteResult
suite_result = AGTestSuiteResult.objects.validate_and_create(
    ag_test_suite=${ag_test_suite.pk},
    submission=${submission_pk},
    setup_return_code=0,
)

with open(suite_result.setup_stdout_filename, 'w') as f:
    f.write('${ag_test_suite_setup_stdout}')

with open(suite_result.setup_stderr_filename, 'w') as f:
    f.write('${ag_test_suite_setup_stderr}')

print(suite_result.pk)
    `;

    result = run_in_django_shell(make_ag_test_suite_result);
    ag_test_suite_result_pk = parseInt(result.stdout, 10);

    let make_ag_test_cmd_result = `
from autograder.core.models import AGTestCaseResult, AGTestCommandResult
case_result = AGTestCaseResult.objects.validate_and_create(
    ag_test_case=${ag_test_case.pk},
    ag_test_suite_result=${ag_test_suite_result_pk}
)
cmd_result = AGTestCommandResult.objects.validate_and_create(
    ag_test_case_result=case_result,
    ag_test_command=${ag_test_cmd.pk},
    return_code=0,
    timed_out=False,
    return_code_correct=True,
    stdout_correct=False,
    stderr_correct=False,
)

with open(cmd_result.stdout_filename, 'w') as f:
    f.write('${ag_test_cmd_actual_stdout}')

with open(cmd_result.stderr_filename, 'w') as f:
    f.write('${ag_test_cmd_actual_stderr}')

print(f'{case_result.pk} {cmd_result.pk}')
    `;

    result = run_in_django_shell(make_ag_test_cmd_result);
    [ag_test_case_result_pk, ag_test_cmd_result_pk]
        = result.stdout.split(' ').map(id => parseInt(id, 10));

    let make_mutation_test_suite_result = `
from autograder.core.models import MutationTestSuiteResult, AGCommandResult
suite_result = MutationTestSuiteResult.objects.validate_and_create(
    mutation_test_suite=${mutation_test_suite.pk},
    submission=${submission_pk},

    student_tests=['test1', 'test2', 'test3'],
    discarded_tests=[],
    invalid_tests=['test2'],
    timed_out_tests=['test2'],
    bugs_exposed=['bug1', 'bug2'],

    setup_result=AGCommandResult.objects.validate_and_create(
        return_code=0,
        timed_out=False
    ),
    get_test_names_result=AGCommandResult.objects.validate_and_create(
        return_code=0,
        timed_out=False
    )
)

with open(suite_result.setup_result.stdout_filename, 'w') as f:
    f.write('${mutation_suite_setup_result_stdout}')
with open(suite_result.setup_result.stderr_filename, 'w') as f:
    f.write('${mutation_suite_setup_result_stderr}')

with open(suite_result.get_test_names_result.stdout_filename, 'w') as f:
    f.write('${get_test_names_stdout}')
with open(suite_result.get_test_names_result.stderr_filename, 'w') as f:
    f.write('${get_test_names_stderr}')


with open(suite_result.validity_check_stdout_filename, 'w') as f:
    f.write('${validity_check_stdout}')
with open(suite_result.validity_check_stderr_filename, 'w') as f:
    f.write('${validity_check_stderr}')

with open(suite_result.grade_buggy_impls_stdout_filename, 'w') as f:
    f.write('${grade_buggy_impls_stdout}')
with open(suite_result.grade_buggy_impls_stderr_filename, 'w') as f:
    f.write('${grade_buggy_impls_stderr}')

print(suite_result.pk)
    `;

    result = run_in_django_shell(make_mutation_test_suite_result);
    mutation_test_suite_result_pk = parseInt(result.stdout, 10);

    let update_denormalized_submission_results = `
from autograder.core.submission_feedback import update_denormalized_ag_test_results
update_denormalized_ag_test_results(${submission_pk})
    `;
    run_in_django_shell(update_denormalized_submission_results);
});

describe('get_submission_result tests', () => {
    test('get_submission_result max feedback', async () => {
        let result = await cli.get_submission_result(submission_pk, cli.FeedbackCategory.max);
        let expected: cli.SubmissionResultFeedback = {
            pk: submission_pk,
            total_points: '3.00',
            total_points_possible: '10.00',
            ag_test_suite_results: [{
                ag_test_suite_name: ag_test_suite.name,
                ag_test_suite_pk: ag_test_suite.pk,
                fdbk_settings: ag_test_suite.staff_viewer_fdbk_config, // should be same as max
                pk: ag_test_suite_result_pk,
                setup_name: ag_test_suite.setup_suite_cmd_name,
                setup_return_code: 0,
                setup_timed_out: false,
                total_points: 1,
                total_points_possible: 7,

                ag_test_case_results: [{
                    ag_test_case_name: ag_test_case.name,
                    ag_test_case_pk: ag_test_case.pk,
                    fdbk_settings: ag_test_case.staff_viewer_fdbk_config, // should be same as max
                    pk: ag_test_case_result_pk,

                    total_points: 1,
                    total_points_possible: 7,

                    ag_test_command_results: [{
                        pk: ag_test_cmd_result_pk,
                        ag_test_command_pk: ag_test_cmd.pk,
                        ag_test_command_name: ag_test_cmd.name,
                        fdbk_settings: ag_test_cmd.staff_viewer_fdbk_config,
                        actual_return_code: 0,
                        timed_out: false,
                        expected_return_code: cli.ExpectedReturnCode.zero,
                        return_code_correct: true,
                        return_code_points: 1,
                        return_code_points_possible: 1,
                        stdout_correct: false,
                        stdout_points: 0,
                        stdout_points_possible: 2,
                        stderr_correct: false,
                        stderr_points: 0,
                        stderr_points_possible: 4,
                        total_points: 1,
                        total_points_possible: 7
                    }]
                }]
            }],
            mutation_test_suite_results: [
                {
                    pk: mutation_test_suite_result_pk,
                    mutation_test_suite_name: 'Mutation test suite',
                    mutation_test_suite_pk: mutation_test_suite.pk,
                    // Staff viewer should be same as max, except for
                    // bugs_exposed_fdbk_level
                    fdbk_settings: {
                        ...mutation_test_suite.staff_viewer_fdbk_config,
                        bugs_exposed_fdbk_level: cli.BugsExposedFeedbackLevel.all_bug_names
                    },
                    has_setup_command: true,
                    setup_command_name: '',
                    setup_return_code: 0,
                    setup_timed_out: false,
                    get_student_test_names_return_code: 0,
                    get_student_test_names_timed_out: false,
                    student_tests: ['test1', 'test2', 'test3'],
                    discarded_tests: [],
                    invalid_tests: ['test2'],
                    timed_out_tests: ['test2'],
                    num_bugs_exposed: 2,
                    bugs_exposed: ['bug1', 'bug2'],
                    all_bug_names: mutation_test_suite.buggy_impl_names,
                    total_points: '2.00',
                    total_points_possible: '3.00'
                }
            ],
        };
        expect(result).toEqual(expected);
    });

    test('get_submission_result min feedback', async () => {
        let result = await cli.get_submission_result(submission_pk, cli.FeedbackCategory.normal);
        let expected: cli.SubmissionResultFeedback = {
            pk: submission_pk,
            total_points: 0,
            total_points_possible: 0,
            ag_test_suite_results: [{
                ag_test_suite_name: ag_test_suite.name,
                ag_test_suite_pk: ag_test_suite.pk,
                fdbk_settings: ag_test_suite.normal_fdbk_config, // should be same as max
                pk: ag_test_suite_result_pk,
                setup_name: null,
                setup_return_code: null,
                setup_timed_out: null,
                total_points: 0,
                total_points_possible: 0,

                ag_test_case_results: [{
                    ag_test_case_name: ag_test_case.name,
                    ag_test_case_pk: ag_test_case.pk,
                    fdbk_settings: ag_test_case.normal_fdbk_config, // should be same as max
                    pk: ag_test_case_result_pk,

                    total_points: 0,
                    total_points_possible: 0,

                    ag_test_command_results: [{
                        pk: ag_test_cmd_result_pk,
                        ag_test_command_pk: ag_test_cmd.pk,
                        ag_test_command_name: ag_test_cmd.name,
                        fdbk_settings: ag_test_cmd.normal_fdbk_config,
                        actual_return_code: null,
                        timed_out: null,
                        expected_return_code: null,
                        return_code_correct: null,
                        return_code_points: 0,
                        return_code_points_possible: 0,
                        stdout_correct: null,
                        stdout_points: 0,
                        stdout_points_possible: 0,
                        stderr_correct: null,
                        stderr_points: 0,
                        stderr_points_possible: 0,
                        total_points: 0,
                        total_points_possible: 0,
                    }]
                }]
            }],
            mutation_test_suite_results: [
                {
                    pk: mutation_test_suite_result_pk,
                    mutation_test_suite_name: 'Mutation test suite',
                    mutation_test_suite_pk: mutation_test_suite.pk,
                    // Staff viewer should be same as max
                    fdbk_settings: mutation_test_suite.normal_fdbk_config,
                    has_setup_command: true,
                    setup_command_name: '',
                    setup_return_code: null,
                    setup_timed_out: null,
                    get_student_test_names_return_code: null,
                    get_student_test_names_timed_out: null,
                    student_tests: ['test1', 'test2', 'test3'],
                    discarded_tests: [],
                    invalid_tests: null,
                    timed_out_tests: null,
                    num_bugs_exposed: null,
                    bugs_exposed: null,
                    all_bug_names: null,
                    total_points: 0,
                    total_points_possible: 0,
                }
            ],
        };

        expect(result).toEqual(expected);
    });
});

describe('AG test suite result output tests', () => {
    test('Output size', async () => {
        let actual = await cli.ResultOutput.get_ag_test_suite_result_output_size(
            submission_pk, ag_test_suite_result_pk, cli.FeedbackCategory.max);
        let expected = {
            setup_stdout_size: ag_test_suite_setup_stdout.length,
            setup_stderr_size: ag_test_suite_setup_stderr.length,
            setup_stdout_truncated: false,
            setup_stderr_truncated: false,
        };
        expect(actual).toEqual(expected);
    });

    test('Output size values null', async () => {
        let actual = await cli.ResultOutput.get_ag_test_suite_result_output_size(
            submission_pk, ag_test_suite_result_pk, cli.FeedbackCategory.normal);
        let expected = {
            setup_stdout_size: null,
            setup_stderr_size: null,
            setup_stdout_truncated: null,
            setup_stderr_truncated: null,
        };
        expect(actual).toEqual(expected);
    });

    test('Setup stdout', async () => {
        let actual = await cli.ResultOutput.get_ag_test_suite_result_setup_stdout(
            submission_pk, ag_test_suite_result_pk, cli.FeedbackCategory.max);
        expect(actual).toEqual(ag_test_suite_setup_stdout);
    });

    test('Setup stderr', async () => {
        let actual = await cli.ResultOutput.get_ag_test_suite_result_setup_stderr(
            submission_pk, ag_test_suite_result_pk, cli.FeedbackCategory.max);
        expect(actual).toEqual(ag_test_suite_setup_stderr);
    });
});

describe('AG test cmd result output tests', () => {
    test('Output size', async () => {
        let actual = await cli.ResultOutput.get_ag_test_cmd_result_output_size(
            submission_pk, ag_test_cmd_result_pk, cli.FeedbackCategory.max);
        expect(actual).toEqual({
            stdout_size: ag_test_cmd_actual_stdout.length,
            stderr_size: ag_test_cmd_actual_stderr.length,
            stdout_truncated: false,
            stderr_truncated: false,
            // The + 4 is from the sentinal characters added to the diff lines
            stdout_diff_size: (ag_test_cmd_actual_stdout.length
                               + ag_test_cmd_expected_stdout.length + 4),
            stderr_diff_size: (ag_test_cmd_actual_stderr.length
                               + ag_test_cmd_expected_stderr.length + 4),
        });
    });

    test('Output size values null', async () => {
        let actual = await cli.ResultOutput.get_ag_test_cmd_result_output_size(
            submission_pk, ag_test_cmd_result_pk, cli.FeedbackCategory.normal);

        expect(actual).toEqual({
            stdout_size: null,
            stderr_size: null,
            stdout_truncated: null,
            stderr_truncated: null,
            stdout_diff_size: null,
            stderr_diff_size: null,
        });
    });

    test('Stdout', async () => {
        let actual = await cli.ResultOutput.get_ag_test_cmd_result_stdout(
            submission_pk, ag_test_cmd_result_pk, cli.FeedbackCategory.max);
        expect(actual).toEqual(ag_test_cmd_actual_stdout);
    });

    test('Stderr', async () => {
        let actual = await cli.ResultOutput.get_ag_test_cmd_result_stderr(
            submission_pk, ag_test_cmd_result_pk, cli.FeedbackCategory.max);
        expect(actual).toEqual(ag_test_cmd_actual_stderr);
    });

    test('Stdout diff', async () => {
        let actual = await cli.ResultOutput.get_ag_test_cmd_result_stdout_diff(
            submission_pk, ag_test_cmd_result_pk, cli.FeedbackCategory.max);
        let expected = [
            `- ${ag_test_cmd_expected_stdout}`,
            `+ ${ag_test_cmd_actual_stdout}`
        ];
        expect(actual).toEqual(expected);
    });

    test('Stderr diff', async () => {
        let actual = await cli.ResultOutput.get_ag_test_cmd_result_stderr_diff(
            submission_pk, ag_test_cmd_result_pk, cli.FeedbackCategory.max);
        let expected = [
            `- ${ag_test_cmd_expected_stderr}`,
            `+ ${ag_test_cmd_actual_stderr}`
        ];
        expect(actual).toEqual(expected);
    });
});

describe('Mutation test suite result output tests', () => {
    test('Output size', async () => {
        let actual = await cli.ResultOutput.get_mutation_test_suite_result_output_size(
            submission_pk, mutation_test_suite_result_pk, cli.FeedbackCategory.max);
        let expected = {
            setup_stdout_size: mutation_suite_setup_result_stdout.length,
            setup_stderr_size: mutation_suite_setup_result_stderr.length,
            get_student_test_names_stdout_size: get_test_names_stdout.length,
            get_student_test_names_stderr_size: get_test_names_stderr.length,
            validity_check_stdout_size: validity_check_stdout.length,
            validity_check_stderr_size: validity_check_stderr.length,
            grade_buggy_impls_stdout_size: grade_buggy_impls_stdout.length,
            grade_buggy_impls_stderr_size: grade_buggy_impls_stderr.length,
        };
        expect(actual).toEqual(expected);
    });

    test('Output size values null', async () => {
        let actual = await cli.ResultOutput.get_mutation_test_suite_result_output_size(
            submission_pk, mutation_test_suite_result_pk, cli.FeedbackCategory.normal);
        let expected = {
            setup_stdout_size: null,
            setup_stderr_size: null,
            get_student_test_names_stdout_size: null,
            get_student_test_names_stderr_size: null,
            validity_check_stdout_size: null,
            validity_check_stderr_size: null,
            grade_buggy_impls_stdout_size: null,
            grade_buggy_impls_stderr_size: null,
        };
        expect(actual).toEqual(expected);
    });

    test('setup_stdout', async () => {
        let actual = await cli.ResultOutput.get_mutation_test_suite_result_setup_stdout(
            submission_pk, mutation_test_suite_result_pk, cli.FeedbackCategory.max);
        expect(actual).toEqual(mutation_suite_setup_result_stdout);
    });

    test('setup_stderr', async () => {
        let actual = await cli.ResultOutput.get_mutation_test_suite_result_setup_stderr(
            submission_pk, mutation_test_suite_result_pk, cli.FeedbackCategory.max);
        expect(actual).toEqual(mutation_suite_setup_result_stderr);
    });

    test('get_student_test_names_stdout', async () => {
        let actual = (
            await cli.ResultOutput.get_mutation_test_suite_result_get_student_test_names_stdout(
                submission_pk, mutation_test_suite_result_pk, cli.FeedbackCategory.max)
        );
        expect(actual).toEqual(get_test_names_stdout);
    });

    test('get_student_test_names_stderr', async () => {
        let actual = (
            await cli.ResultOutput.get_mutation_test_suite_result_get_student_test_names_stderr(
                submission_pk, mutation_test_suite_result_pk, cli.FeedbackCategory.max)
        );
        expect(actual).toEqual(get_test_names_stderr);
    });

    test('validity_check_stdout', async () => {
        let actual = await cli.ResultOutput.get_mutation_test_suite_result_validity_check_stdout(
            submission_pk, mutation_test_suite_result_pk, cli.FeedbackCategory.max);
        expect(actual).toEqual(validity_check_stdout);
    });

    test('validity_check_stderr', async () => {
        let actual = await cli.ResultOutput.get_mutation_test_suite_result_validity_check_stderr(
            submission_pk, mutation_test_suite_result_pk, cli.FeedbackCategory.max);
        expect(actual).toEqual(validity_check_stderr);
    });

    test('grade_buggy_impls_stdout', async () => {
        let actual = (
            await cli.ResultOutput.get_mutation_test_suite_result_grade_buggy_impls_stdout(
                submission_pk, mutation_test_suite_result_pk, cli.FeedbackCategory.max)
        );
        expect(actual).toEqual(grade_buggy_impls_stdout);
    });

    test('grade_buggy_impls_stderr', async () => {
        let actual = (
            await cli.ResultOutput.get_mutation_test_suite_result_grade_buggy_impls_stderr(
                submission_pk, mutation_test_suite_result_pk, cli.FeedbackCategory.max)
        );
        expect(actual).toEqual(grade_buggy_impls_stderr);
    });
});
