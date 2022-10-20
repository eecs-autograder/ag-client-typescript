import { Annotation, AnnotationData } from './annotation';
import { Deletable, ID, SaveableAPIObject } from "./base";
import { Criterion, CriterionData } from './criterion';
import { HttpClient } from './http_client';
import { filter_keys, safe_assign } from './utils';

export class HandgradingRubricCoreData {
    pk: ID;
    project: number;
    last_modified: string;
    points_style: PointsStyle;
    max_points: number | null;
    show_grades_and_rubric_to_students: boolean;
    show_only_applied_rubric_to_students: boolean;
    handgraders_can_leave_comments: boolean;
    handgraders_can_adjust_points: boolean;

    constructor(args: HandgradingRubricCoreData) {
        this.pk = args.pk;
        this.project = args.project;
        this.last_modified = args.last_modified;
        this.points_style = args.points_style;
        this.max_points = args.max_points;
        this.show_grades_and_rubric_to_students = args.show_grades_and_rubric_to_students;
        this.show_only_applied_rubric_to_students = args.show_only_applied_rubric_to_students;
        this.handgraders_can_leave_comments = args.handgraders_can_leave_comments;
        this.handgraders_can_adjust_points = args.handgraders_can_adjust_points;
    }
}

export interface HandgradingRubricCtorArgs extends HandgradingRubricCoreData {
    criteria: CriterionData[];
    annotations: AnnotationData[];
}

export interface HandgradingRubricData extends HandgradingRubricCtorArgs {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    _handgrading_rubric_data_brand: unknown;
}

export interface HandgradingRubricObserver {
    update_handgrading_rubric_created(handgrading_rubric: HandgradingRubric): void;
    update_handgrading_rubric_changed(handgrading_rubric: HandgradingRubric): void;
    update_handgrading_rubric_deleted(handgrading_rubric: HandgradingRubric): void;
}

export class HandgradingRubric extends HandgradingRubricCoreData implements SaveableAPIObject,
                                                                            Deletable {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    private _handgrading_rubric_brand: unknown;

    criteria: Criterion[];
    annotations: Annotation[];

    constructor(args: HandgradingRubricCtorArgs) {
        super(args);
        this.criteria = args.criteria.map(item => new Criterion(item));
        this.annotations = args.annotations.map(item => new Annotation(item));
    }

    private static _subscribers = new Set<HandgradingRubricObserver>();

    static subscribe(observer: HandgradingRubricObserver) {
        HandgradingRubric._subscribers.add(observer);
    }

    static unsubscribe(observer: HandgradingRubricObserver) {
        HandgradingRubric._subscribers.delete(observer);
    }

    static async get_from_project(project_pk: ID): Promise<HandgradingRubric> {
        let response = await HttpClient.get_instance().get<HandgradingRubricData>(
            `/projects/${project_pk}/handgrading_rubric/`
        );
        return new HandgradingRubric(response.data);
    }

    static async get_by_pk(handgrading_rubric_pk: ID): Promise<HandgradingRubric> {
        let response = await HttpClient.get_instance().get<HandgradingRubricData>(
            `/handgrading_rubrics/${handgrading_rubric_pk}/`
        );
        return new HandgradingRubric(response.data);
    }

    static async create(project_pk: ID,
                        data: NewHandgradingRubricData): Promise<HandgradingRubric> {
        let response = await HttpClient.get_instance().post<HandgradingRubricData>(
            `/projects/${project_pk}/handgrading_rubric/`,
            data
        );
        let result = new HandgradingRubric(response.data);
        HandgradingRubric.notify_handgrading_rubric_created(result);
        return result;
    }

    static async import_from_project(import_to_project_pk: ID,
                                     import_from_project_pk: ID): Promise<HandgradingRubric> {
        let response = await HttpClient.get_instance().post<HandgradingRubricData>(
            `/projects/${import_to_project_pk}`
            + `/import_handgrading_rubric_from/${import_from_project_pk}/`
        );
        let result = new HandgradingRubric(response.data);
        HandgradingRubric.notify_handgrading_rubric_created(result);
        return result;
    }

    static notify_handgrading_rubric_created(handgrading_rubric: HandgradingRubric) {
        for (let subscriber of HandgradingRubric._subscribers) {
            subscriber.update_handgrading_rubric_created(handgrading_rubric);
        }
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<HandgradingRubricData>(
            `/handgrading_rubrics/${this.pk}/`,
            filter_keys(this, HandgradingRubric.EDITABLE_FIELDS)
        );

        safe_assign(this, new HandgradingRubric(response.data));
        HandgradingRubric.notify_handgrading_rubric_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<HandgradingRubricData>(
            `/handgrading_rubrics/${this.pk}/`
        );
        safe_assign(this, new HandgradingRubric(response.data));

        if (last_modified !== this.last_modified) {
            HandgradingRubric.notify_handgrading_rubric_changed(this);
        }
    }

    static notify_handgrading_rubric_changed(handgrading_rubric: HandgradingRubric) {
        for (let subscriber of HandgradingRubric._subscribers) {
            subscriber.update_handgrading_rubric_changed(handgrading_rubric);
        }
    }

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(
            `/handgrading_rubrics/${this.pk}/`
        );
        HandgradingRubric.notify_handgrading_rubric_deleted(this);
    }

    static notify_handgrading_rubric_deleted(handgrading_rubric: HandgradingRubric) {
        for (let subscriber of HandgradingRubric._subscribers) {
            subscriber.update_handgrading_rubric_deleted(handgrading_rubric);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof HandgradingRubricCoreData)[] = [
        'points_style',
        'max_points',
        'show_grades_and_rubric_to_students',
        'show_only_applied_rubric_to_students',
        'handgraders_can_leave_comments',
        'handgraders_can_adjust_points',
    ];
}

export class NewHandgradingRubricData {
    points_style?: string;
    max_points?: number;
    show_grades_and_rubric_to_students?: boolean;
    show_only_applied_rubric_to_students?: boolean;
    handgraders_can_leave_comments?: boolean;
    handgraders_can_adjust_points?: boolean;

    constructor({
        points_style,
        max_points,
        show_grades_and_rubric_to_students,
        show_only_applied_rubric_to_students,
        handgraders_can_leave_comments,
        handgraders_can_adjust_points,
    }: NewHandgradingRubricData) {
        this.points_style = points_style;
        this.max_points = max_points;
        this.show_grades_and_rubric_to_students = show_grades_and_rubric_to_students;
        this.show_only_applied_rubric_to_students = show_only_applied_rubric_to_students;
        this.handgraders_can_leave_comments = handgraders_can_leave_comments;
        this.handgraders_can_adjust_points = handgraders_can_adjust_points;
    }
}

export enum PointsStyle {
    start_at_zero_and_add = 'start_at_zero_and_add',
    start_at_max_and_subtract = 'start_at_max_and_subtract',
}
