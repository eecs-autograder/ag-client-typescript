import { AGTestCaseFeedbackConfig } from "./ag_test_case";
import { AGTestCommandFeedbackConfig, ExpectedReturnCode } from "./ag_test_command";
import { AGTestSuiteFeedbackConfig } from "./ag_test_suite";
import { ID } from "./base";
import { HttpClient, ProgressEventListener } from "./http_client";
import { MutationTestSuiteFeedbackConfig } from "./mutation_test_suite";

export enum FeedbackCategory {
    normal = 'normal',
    past_limit_submission = 'past_limit_submission',
    ultimate_submission = 'ultimate_submission',
    staff_viewer = 'staff_viewer',
    max = 'max',
}

export async function get_submission_result(
    submission_pk: ID,
    feedback_category: FeedbackCategory
): Promise<SubmissionResultFeedback> {
    let response = await HttpClient.get_instance().get<SubmissionResultFeedback>(
        `/submissions/${submission_pk}/results/?feedback_category=${feedback_category}`);
    return response.data;
}

// tslint:disable-next-line: no-namespace
export namespace ResultOutput {
    export async function get_ag_test_cmd_result_output_size(
        submission_pk: ID,
        ag_test_cmd_result_pk: ID,
        feedback_category: FeedbackCategory,
    ): Promise<AGTestCommandResultOutputSize> {
        let response = await HttpClient.get_instance().get<AGTestCommandResultOutputSize>(
            `/submissions/${submission_pk}/ag_test_cmd_results/`
            + `${ag_test_cmd_result_pk}/output_size/`
            + `?feedback_category=${feedback_category}`
        );
        return response.data;
    }

    export interface AGTestCommandResultOutputSize {
        stdout_size: number | null;
        stderr_size: number | null;
        stdout_truncated: number | null;
        stderr_truncated: number | null;
        stdout_diff_size: number | null;
        stderr_diff_size: number | null;
    }

    export async function get_ag_test_cmd_result_stdout(
        submission_pk: ID,
        ag_test_cmd_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/ag_test_cmd_results/${ag_test_cmd_result_pk}/stdout/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_ag_test_cmd_result_stderr(
        submission_pk: ID,
        ag_test_cmd_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/ag_test_cmd_results/${ag_test_cmd_result_pk}/stderr/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_ag_test_cmd_result_stdout_diff(
        submission_pk: ID,
        ag_test_cmd_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string[]> {
        let response = await HttpClient.get_instance().get<string[]>(
            `/submissions/${submission_pk}/ag_test_cmd_results/`
            + `${ag_test_cmd_result_pk}/stdout_diff/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_ag_test_cmd_result_stderr_diff(
        submission_pk: ID,
        ag_test_cmd_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string[]> {
        let response = await HttpClient.get_instance().get<string[]>(
            `/submissions/${submission_pk}/ag_test_cmd_results/`
            + `${ag_test_cmd_result_pk}/stderr_diff/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_ag_test_suite_result_output_size(
        submission_pk: ID,
        ag_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory
    ): Promise<AGTestSuiteResultOutputSize> {
        let response = await HttpClient.get_instance().get<AGTestSuiteResultOutputSize>(
            `/submissions/${submission_pk}/ag_test_suite_results/`
            + `${ag_test_suite_result_pk}/output_size/`
            + `?feedback_category=${feedback_category}`
        );
        return response.data;
    }

    export interface AGTestSuiteResultOutputSize {
        setup_stdout_size: number | null;
        setup_stderr_size: number | null;
        setup_stdout_truncated: boolean | null;
        setup_stderr_truncated: boolean | null;
    }

    export async function get_ag_test_suite_result_setup_stdout(
        submission_pk: ID,
        ag_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/ag_test_suite_results/${ag_test_suite_result_pk}/stdout/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_ag_test_suite_result_setup_stderr(
        submission_pk: ID,
        ag_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/ag_test_suite_results/${ag_test_suite_result_pk}/stderr/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_mutation_test_suite_result_output_size(
        submission_pk: ID,
        mutation_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory
    ): Promise<MutationTestSuiteResultOutputSize> {
        let response = await HttpClient.get_instance().get<MutationTestSuiteResultOutputSize>(
            `/submissions/${submission_pk}/mutation_test_suite_results/`
            + `${mutation_test_suite_result_pk}/output_size/`
            + `?feedback_category=${feedback_category}`
        );
        return response.data;
    }

    export interface MutationTestSuiteResultOutputSize {
        setup_stdout_size: number | null;
        setup_stderr_size: number | null;
        get_student_test_names_stdout_size: number | null;
        get_student_test_names_stderr_size: number | null;
        validity_check_stdout_size: number | null;
        validity_check_stderr_size: number | null;
        grade_buggy_impls_stdout_size: number | null;
        grade_buggy_impls_stderr_size: number | null;
    }

    export async function get_mutation_test_suite_result_setup_stdout(
        submission_pk: ID,
        mutation_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/mutation_test_suite_results/`
            + `${mutation_test_suite_result_pk}/setup_stdout/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_mutation_test_suite_result_setup_stderr(
        submission_pk: ID,
        mutation_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/mutation_test_suite_results/`
            + `${mutation_test_suite_result_pk}/setup_stderr/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_mutation_test_suite_result_get_student_test_names_stdout(
        submission_pk: ID,
        mutation_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/mutation_test_suite_results/`
            + `${mutation_test_suite_result_pk}/get_student_test_names_stdout/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_mutation_test_suite_result_get_student_test_names_stderr(
        submission_pk: ID,
        mutation_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/mutation_test_suite_results/`
            + `${mutation_test_suite_result_pk}/get_student_test_names_stderr/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_mutation_test_suite_result_validity_check_stdout(
        submission_pk: ID,
        mutation_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/mutation_test_suite_results/`
            + `${mutation_test_suite_result_pk}/validity_check_stdout/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_mutation_test_suite_result_validity_check_stderr(
        submission_pk: ID,
        mutation_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/mutation_test_suite_results/`
            + `${mutation_test_suite_result_pk}/validity_check_stderr/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_mutation_test_suite_result_grade_buggy_impls_stdout(
        submission_pk: ID,
        mutation_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/mutation_test_suite_results/`
            + `${mutation_test_suite_result_pk}/grade_buggy_impls_stdout/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    export async function get_mutation_test_suite_result_grade_buggy_impls_stderr(
        submission_pk: ID,
        mutation_test_suite_result_pk: ID,
        feedback_category: FeedbackCategory,
        on_download_progress?: ProgressEventListener
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/submissions/${submission_pk}/mutation_test_suite_results/`
            + `${mutation_test_suite_result_pk}/grade_buggy_impls_stderr/`
            + `?feedback_category=${feedback_category}`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }
}

export interface SubmissionResultFeedback {
    pk: ID;
    total_points: string | number;
    total_points_possible: string | number;
    ag_test_suite_results: AGTestSuiteResultFeedback[];
    mutation_test_suite_results: MutationTestSuiteResultFeedback[];
}

export interface AGTestSuiteResultFeedback {
    pk: ID;
    ag_test_suite_name: string;
    ag_test_suite_pk: ID;
    fdbk_settings: AGTestSuiteFeedbackConfig;
    total_points: number;
    total_points_possible: number;
    setup_name: string | null;
    setup_return_code: number | null;
    setup_timed_out: boolean | null;
    ag_test_case_results: AGTestCaseResultFeedback[];
}

export interface AGTestCaseResultFeedback {
    pk: ID;
    ag_test_case_name: string;
    ag_test_case_pk: ID;
    fdbk_settings: AGTestCaseFeedbackConfig;
    total_points: number;
    total_points_possible: number;
    ag_test_command_results: AGTestCommandResultFeedback[];
}

export interface AGTestCommandResultFeedback {
    pk: ID;
    ag_test_command_pk: ID;
    ag_test_command_name: string;
    fdbk_settings: AGTestCommandFeedbackConfig;
    timed_out: boolean | null;
    return_code_correct: boolean | null;
    expected_return_code: ExpectedReturnCode | null;
    actual_return_code: number | null;
    return_code_points: number;
    return_code_points_possible: number;
    stdout_correct: boolean | null;
    stdout_points: number;
    stdout_points_possible: number;
    stderr_correct: boolean | null;
    stderr_points: number;
    stderr_points_possible: number;
    total_points: number;
    total_points_possible: number;
}

export interface MutationTestSuiteResultFeedback {
    pk: number;
    mutation_test_suite_name: string;
    mutation_test_suite_pk: number;
    fdbk_settings: MutationTestSuiteFeedbackConfig;
    has_setup_command: boolean;
    setup_command_name: string | null;
    setup_return_code: number | null;
    setup_timed_out: boolean | null;
    get_student_test_names_return_code: number | null;
    get_student_test_names_timed_out: boolean | null;
    student_tests: string[];
    discarded_tests: string[];
    invalid_tests: string[] | null;
    timed_out_tests: string[] | null;
    num_bugs_exposed: number | null;
    bugs_exposed: string[] | null;
    all_bug_names: string[] | null;
    total_points: string | number;
    total_points_possible: string | number;
}
