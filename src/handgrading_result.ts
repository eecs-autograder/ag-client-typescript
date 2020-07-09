import { AppliedAnnotation, AppliedAnnotationData } from './applied_annotation';
import { ID, Refreshable } from "./base";
import { Comment, CommentData } from "./comment";
import { CriterionResult, CriterionResultCtorArgs } from './criterion_result';
import { GroupData } from './group';
import { HandgradingRubric, HandgradingRubricCtorArgs } from './handgrading_rubric';
import { HttpClient, ProgressEventListener } from './http_client';
import { safe_assign } from './utils';

export class HandgradingResultCoreData {
    pk: number;
    last_modified: string;
    submission: number;
    group: number;
    finished_grading: boolean;
    points_adjustment: number;
    submitted_filenames: string[];
    total_points: number;
    total_points_possible: number;

    constructor(args: HandgradingResultCoreData) {
        this.pk = args.pk;
        this.last_modified = args.last_modified;
        this.submission = args.submission;
        this.group = args.group;
        this.finished_grading = args.finished_grading;
        this.points_adjustment = args.points_adjustment;
        this.submitted_filenames = args.submitted_filenames;
        this.total_points = args.total_points;
        this.total_points_possible = args.total_points_possible;
    }
}

interface HandgradingResultCtorArgs extends HandgradingResultCoreData {
    // Need to use *CtorArgs instead of *Data because HandgradingResultData has _brand
    handgrading_rubric: HandgradingRubricCtorArgs;
    applied_annotations: AppliedAnnotationData[];
    comments: CommentData[];
    // Need to use *CtorArgs instead of Data because CriterionResultData has _brand
    criterion_results: CriterionResultCtorArgs[];
}

export interface HandgradingResultData extends HandgradingResultCtorArgs {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    _handgrading_result_data_brand: unknown;
}

export interface HandgradingResultObserver {
    update_handgrading_result_created(handgrading_result: HandgradingResult): void;
    update_handgrading_result_changed(handgrading_result: HandgradingResult): void;
}

export class HandgradingResult extends HandgradingResultCoreData implements Refreshable {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    private _handgrading_result_brand: unknown;

    handgrading_rubric: HandgradingRubric;
    applied_annotations: AppliedAnnotation[];
    comments: Comment[];
    criterion_results: CriterionResult[];

    constructor(args: HandgradingResultCtorArgs) {
        super(args);

        this.handgrading_rubric = new HandgradingRubric(args.handgrading_rubric);
        this.applied_annotations = args.applied_annotations.map(
            item => new AppliedAnnotation(item));
        this.comments = args.comments.map(item => new Comment(item));
        this.criterion_results = args.criterion_results.map(item => new CriterionResult(item));
    }

    private static _subscribers = new Set<HandgradingResultObserver>();

    static subscribe(observer: HandgradingResultObserver) {
        HandgradingResult._subscribers.add(observer);
    }

    static unsubscribe(observer: HandgradingResultObserver) {
        HandgradingResult._subscribers.delete(observer);
    }

    static async get_all_summaries_from_project(
        project_pk: number,
        {
            page_url = '',
            include_staff = true,
            page_num = 1,
            page_size = 1000,
        }: {
            page_url?: string,
            include_staff?: boolean,
            page_num?: number,
            page_size?: number,
        } = {}
    ): Promise<HandgradingResultPage> {
        const queries = `?page_size=${page_size}&page=${page_num}&include_staff=${include_staff}`;
        const url = page_url !== '' ? page_url :
            `/projects/${project_pk}/handgrading_results/${queries}`;

        let response = await HttpClient.get_instance().get<HandgradingResultPage>(url);
        return new HandgradingResultPage(response.data);
    }

    static async get_by_group_pk(group_pk: number): Promise<HandgradingResult> {
        let response = await HttpClient.get_instance().get<HandgradingResultData>(
            `/groups/${group_pk}/handgrading_result/`
        );
        return new HandgradingResult(response.data);
    }

    static async get_or_create(group_pk: number): Promise<HandgradingResult> {
        let response = await HttpClient.get_instance().post<HandgradingResultData>(
            `/groups/${group_pk}/handgrading_result/`, {}
        );

        let result = new HandgradingResult(response.data);

        // Only notify the observer if a handgrading result is actually created
        if (response.status === 201) {
            HandgradingResult.notify_handgrading_result_created(result);
        }

        return result;
    }

    static notify_handgrading_result_created(handgrading_result: HandgradingResult) {
        for (let subscriber of HandgradingResult._subscribers) {
            subscriber.update_handgrading_result_created(handgrading_result);
        }
    }

    static async get_file_from_handgrading_result(
        group_pk: number, file: string,
        on_download_progress?: ProgressEventListener,
    ): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/groups/${group_pk}/handgrading_result/file/?filename=${file}`,
            {on_download_progress: on_download_progress}
        );

        return response.data;
    }

    async save_finished_grading(): Promise<void> {
        let response = await HttpClient.get_instance().patch<HandgradingResultData>(
            `/groups/${this.group}/handgrading_result/`,
            {finished_grading: this.finished_grading}
        );

        safe_assign(this, new HandgradingResult(response.data));
        HandgradingResult.notify_handgrading_result_changed(this);
    }

    async save_points_adjustment(): Promise<void> {
        let response = await HttpClient.get_instance().patch<HandgradingResultData>(
            `/groups/${this.group}/handgrading_result/`,
            {points_adjustment: this.points_adjustment}
        );

        safe_assign(this, new HandgradingResult(response.data));
        HandgradingResult.notify_handgrading_result_changed(this);
    }

    async refresh(): Promise<void> {
        let original_data = {
            last_modified: this.last_modified,
            total_points: this.total_points,
            total_points_possible: this.total_points_possible,
        };
        let response = await HttpClient.get_instance().get<HandgradingResultData>(
            `/groups/${this.group}/handgrading_result/`
        );

        safe_assign(this, new HandgradingResult(response.data));
        if (original_data.last_modified !== this.last_modified
                || original_data.total_points !== this.total_points
                || original_data.total_points_possible !== this.total_points_possible) {
            HandgradingResult.notify_handgrading_result_changed(this);
        }
    }

    static notify_handgrading_result_changed(handgrading_result: HandgradingResult) {
        for (let subscriber of HandgradingResult._subscribers) {
            subscriber.update_handgrading_result_changed(handgrading_result);
        }
    }

    static async reset(group_pk: ID): Promise<HandgradingResult> {
        await HttpClient.get_instance().delete(`/groups/${group_pk}/handgrading_result/`);
        let response = await HttpClient.get_instance().post<HandgradingResultData>(
            `/groups/${group_pk}/handgrading_result/`, {}
        );
        let result = new HandgradingResult(response.data);

        HandgradingResult.notify_handgrading_result_changed(result);
        return result;
    }

    async has_correct_submission(): Promise<boolean> {
        let response = await HttpClient.get_instance().get<boolean>(
            `/groups/${this.group}/handgrading_result/has_correct_submission/`);
        return response.data;
    }

    static readonly EDITABLE_FIELDS: (keyof HandgradingResultCoreData)[] = [
        'finished_grading',
        'points_adjustment',
    ];
}

export interface GroupWithHandgradingResultSummary extends GroupData {
    pk: number;
    project: number;
    extended_due_date: string | null;
    member_names: string[];
    bonus_submissions_remaining: number;
    late_days_used: {[username: string]: number};
    num_submissions: number;
    num_submits_towards_limit: number;
    created_at: string;
    last_modified: string;
    handgrading_result: {
        finished_grading: boolean;
        total_points: number;
        total_points_possible: number;
    } | null;
}

export class HandgradingResultPage {
    count: number;
    next: string | null;
    previous: string | null;
    results: GroupWithHandgradingResultSummary[];

    constructor(args: HandgradingResultPage) {
        this.count = args.count;
        this.next = args.next;
        this.previous = args.previous;
        this.results = args.results;
    }
}
