import { SaveableAPIObject } from "./base";
import { ExpectedStudentFile, ExpectedStudentFileData } from './expected_student_file';
import { HttpClient, HttpResponse } from "./http_client";
import { InstructorFile, InstructorFileData } from './instructor_file';
import { filter_keys, safe_assign, sort_by_name } from "./utils";


class ProjectCoreData {
    pk: number;
    name: string;
    last_modified: string;
    course: number;
    visible_to_students: boolean;
    closing_time?: string | null;
    soft_closing_time: string | null;
    disallow_student_submissions: boolean;
    disallow_group_registration: boolean;
    guests_can_submit: boolean;
    min_group_size: number;
    max_group_size: number;

    submission_limit_per_day: number | null;
    allow_submissions_past_limit: boolean;
    groups_combine_daily_submissions: boolean;
    submission_limit_reset_time: string;
    submission_limit_reset_timezone: string;

    num_bonus_submissions: number;

    total_submission_limit: number | null;

    allow_late_days: boolean;

    ultimate_submission_policy: UltimateSubmissionPolicy;
    hide_ultimate_submission_fdbk: boolean;

    has_handgrading_rubric: boolean;

    constructor(args: ProjectCoreData) {
        this.pk = args.pk;
        this.name = args.name;
        this.last_modified = args.last_modified;
        this.course = args.course;
        this.visible_to_students = args.visible_to_students;
        this.closing_time = args.closing_time;
        this.soft_closing_time = args.soft_closing_time;
        this.disallow_student_submissions = args.disallow_student_submissions;
        this.disallow_group_registration = args.disallow_group_registration;
        this.guests_can_submit = args.guests_can_submit;
        this.min_group_size = args.min_group_size;
        this.max_group_size = args.max_group_size;

        this.submission_limit_per_day = args.submission_limit_per_day;
        this.allow_submissions_past_limit = args.allow_submissions_past_limit;
        this.groups_combine_daily_submissions = args.groups_combine_daily_submissions;
        this.submission_limit_reset_time = args.submission_limit_reset_time;
        this.submission_limit_reset_timezone = args.submission_limit_reset_timezone;

        this.num_bonus_submissions = args.num_bonus_submissions;

        this.total_submission_limit = args.total_submission_limit;

        this.allow_late_days = args.allow_late_days;

        this.ultimate_submission_policy = args.ultimate_submission_policy;
        this.hide_ultimate_submission_fdbk = args.hide_ultimate_submission_fdbk;

        this.has_handgrading_rubric = args.has_handgrading_rubric;
    }
}

interface ProjectCtorArgs extends ProjectCoreData {
    instructor_files?: InstructorFileData[];
    expected_student_files: ExpectedStudentFileData[];
}

export interface ProjectData extends ProjectCtorArgs {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    _project_data_brand: unknown;
}

export interface ProjectObserver {
    update_project_created(project: Project): void;
    update_project_changed(project: Project): void;
}

export class Project extends ProjectCoreData implements SaveableAPIObject {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    private _project_brand: unknown;

    instructor_files?: InstructorFile[];
    expected_student_files: ExpectedStudentFile[];

    constructor(args: ProjectCtorArgs) {
        super(args);

        if (args.instructor_files !== undefined) {
            this.instructor_files = args.instructor_files.map(item => new InstructorFile(item));
        }
        this.expected_student_files = args.expected_student_files.map(
            item => new ExpectedStudentFile(item));
    }

    private static _subscribers = new Set<ProjectObserver>();

    static subscribe(observer: ProjectObserver) {
        Project._subscribers.add(observer);
    }

    static unsubscribe(observer: ProjectObserver) {
        Project._subscribers.delete(observer);
    }

    static async create(course_pk: number, data: NewProjectData) {
        let response = await HttpClient.get_instance().post<ProjectData>(
            `/courses/${course_pk}/projects/`, data);
        let result = new Project(response.data);
        Project.notify_project_created(result);
        return result;
    }

    static notify_project_created(project: Project) {
        for (let subscriber of Project._subscribers) {
            subscriber.update_project_created(project);
        }
    }

    static async get_by_pk(pk: number) {
        let response = await HttpClient.get_instance().get<ProjectData>(`/projects/${pk}/`);
        return new Project(response.data);
    }

    static async get_all_from_course(course_pk: number) {
        let response = await HttpClient.get_instance().get<ProjectData[]>(
            `/courses/${course_pk}/projects/`);
        let projects = response.data.map(project_data => new Project(project_data));
        sort_by_name(projects);
        return projects;
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<ProjectData>(
            `/projects/${this.pk}/`, filter_keys(this, Project.EDITABLE_FIELDS)
        );
        safe_assign(this, new Project(response.data));

        Project.notify_project_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;

        let response = await HttpClient.get_instance().get<ProjectData>(
            `/projects/${this.pk}/`);
        safe_assign(this, new Project(response.data));

        if (last_modified !== this.last_modified) {
            Project.notify_project_changed(this);
        }
    }

    delete(): Promise<HttpResponse> {
        return HttpClient.get_instance().delete(`/projects/${this.pk}/`);
    }

    static notify_project_changed(project: Project) {
        for (let subscriber of Project._subscribers) {
            subscriber.update_project_changed(project);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof ProjectCoreData)[] = [
        'name',
        'visible_to_students',
        'closing_time',
        'soft_closing_time',
        'disallow_student_submissions',
        'disallow_group_registration',
        'guests_can_submit',
        'min_group_size',
        'max_group_size',

        'submission_limit_per_day',
        'allow_submissions_past_limit',
        'groups_combine_daily_submissions',
        'submission_limit_reset_time',
        'submission_limit_reset_timezone',

        'num_bonus_submissions',

        'total_submission_limit',

        'allow_late_days',

        'ultimate_submission_policy',
        'hide_ultimate_submission_fdbk',
    ];

    async num_queued_submissions(): Promise<number> {
        let response = await HttpClient.get_instance().get<number>(
            `/projects/${this.pk}/num_queued_submissions/`
        );
        return response.data;
    }

    async copy_to_course(course_pk: number, new_name: string): Promise<Project> {
        let response = await HttpClient.get_instance().post<ProjectData>(
            `/projects/${this.pk}/copy_to_course/${course_pk}/`,
            {new_project_name: new_name}
        );
        let new_project = new Project(response.data);
        Project.notify_project_created(new_project);
        return new_project;
    }
}

export class NewProjectData {
    name: string;
    visible_to_students?: boolean;
    closing_time?: string | null;
    soft_closing_time?: string | null;
    disallow_student_submissions?: boolean;
    disallow_group_registration?: boolean;
    guests_can_submit?: boolean;
    min_group_size?: number;
    max_group_size?: number;

    submission_limit_per_day?: number | null;
    allow_submissions_past_limit?: boolean;
    groups_combine_daily_submissions?: boolean;
    submission_limit_reset_time?: string;
    submission_limit_reset_timezone?: string;

    num_bonus_submissions?: number;

    total_submission_limit?: number | null;

    allow_late_days?: boolean;

    ultimate_submission_policy?: UltimateSubmissionPolicy;
    hide_ultimate_submission_fdbk?: boolean;

    constructor(args: NewProjectData) {
        this.name = args.name;
        this.visible_to_students = args.visible_to_students;
        this.closing_time = args.closing_time;
        this.soft_closing_time = args.soft_closing_time;
        this.disallow_student_submissions = args.disallow_student_submissions;
        this.disallow_group_registration = args.disallow_group_registration;
        this.guests_can_submit = args.guests_can_submit;
        this.min_group_size = args.min_group_size;
        this.max_group_size = args.max_group_size;

        this.submission_limit_per_day = args.submission_limit_per_day;
        this.allow_submissions_past_limit = args.allow_submissions_past_limit;
        this.groups_combine_daily_submissions = args.groups_combine_daily_submissions;
        this.submission_limit_reset_time = args.submission_limit_reset_time;
        this.submission_limit_reset_timezone = args.submission_limit_reset_timezone;

        this.num_bonus_submissions = args.num_bonus_submissions;

        this.total_submission_limit = args.total_submission_limit;

        this.allow_late_days = args.allow_late_days;

        this.ultimate_submission_policy = args.ultimate_submission_policy;
        this.hide_ultimate_submission_fdbk = args.hide_ultimate_submission_fdbk;
    }
}

// This class contains options for choosing which submissions are
// used for final grading. AG test cases also have a feedback
// option that will only be used for ultimate submissions.
export enum UltimateSubmissionPolicy {
    // The submission that was made most recently
    most_recent = 'most_recent',

    // The submission with the highest score, using "normal"
    // feedback settings to compute scores.
    best_with_normal_fdbk = 'best_basic_score',

    // The submission with the highest score. The score used
    // for comparison is computed using maximum feedback
    // settings.
    best = 'best',
}
