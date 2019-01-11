import { SaveableAPIObject } from "./base";
import { HttpClient } from "./http_client";
import { filter_keys, safe_assign } from "./utils";

export class ProjectData {
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

    // instructor_files
    // expected_student_files

    constructor({
        pk,
        name,
        last_modified,
        course,
        visible_to_students,
        closing_time,
        soft_closing_time,
        disallow_student_submissions,
        disallow_group_registration,
        guests_can_submit,
        min_group_size,
        max_group_size,

        submission_limit_per_day,
        allow_submissions_past_limit,
        groups_combine_daily_submissions,
        submission_limit_reset_time,
        submission_limit_reset_timezone,

        num_bonus_submissions,

        total_submission_limit,

        allow_late_days,

        ultimate_submission_policy,
        hide_ultimate_submission_fdbk,
    }: ProjectData) {
        this.pk = pk;
        this.name = name;
        this.last_modified = last_modified;
        this.course = course;
        this.visible_to_students = visible_to_students;
        this.closing_time = closing_time;
        this.soft_closing_time = soft_closing_time;
        this.disallow_student_submissions = disallow_student_submissions;
        this.disallow_group_registration = disallow_group_registration;
        this.guests_can_submit = guests_can_submit;
        this.min_group_size = min_group_size;
        this.max_group_size = max_group_size;

        this.submission_limit_per_day = submission_limit_per_day;
        this.allow_submissions_past_limit = allow_submissions_past_limit;
        this.groups_combine_daily_submissions = groups_combine_daily_submissions;
        this.submission_limit_reset_time = submission_limit_reset_time;
        this.submission_limit_reset_timezone = submission_limit_reset_timezone;

        this.num_bonus_submissions = num_bonus_submissions;

        this.total_submission_limit = total_submission_limit;

        this.allow_late_days = allow_late_days;

        this.ultimate_submission_policy = ultimate_submission_policy;
        this.hide_ultimate_submission_fdbk = hide_ultimate_submission_fdbk;
    }
}

export class Project extends ProjectData implements SaveableAPIObject {
    static async create(data: NewProjectData) {
        let response = await HttpClient.get_instance().post<ProjectData>(
            `/courses/${data.course}/projects/`, data);
        return new Project(response.data);
    }

    static async get_by_pk(pk: number) {
        let response = await HttpClient.get_instance().get<ProjectData>(`/projects/${pk}/`);
        return new Project(response.data);
    }

    static async get_all_from_course(course_pk: number) {
        let response = await HttpClient.get_instance().get<ProjectData[]>(
            `/courses/${course_pk}/projects/`);
        let projects = response.data.map(project_data => new Project(project_data));
        projects.sort((first: Project, second: Project) => first.name.localeCompare(second.name));
        return projects;
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<ProjectData>(
            `/projects/${this.pk}/`, filter_keys(this, Project.EDITABLE_FIELDS)
        );
        safe_assign(this, response.data);
    }

    async refresh(): Promise<void> {
        let response = await HttpClient.get_instance().get<ProjectData>(`/projects/${this.pk}/`);
        safe_assign(this, response.data);
    }

    static readonly EDITABLE_FIELDS: (keyof ProjectData)[] = [
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
            `/projects/${this.pk}/copy_to_course/${course_pk}/?new_project_name=${new_name}`
        );
        return new Project(response.data);
    }
}

export interface NewProjectData {
    name: string;
    course: number;
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
