import { SaveableAPIObject } from "./base";
import { HttpClient } from "./http_client";
import { filter_keys, safe_assign } from "./utils";

class CourseData {
    pk: number;
    name: string;
    semester: Semester | null;
    year: number | null;
    subtitle: string;
    num_late_days: number;
    last_modified: string;

    constructor({pk,
                 name,
                 semester,
                 year,
                 subtitle,
                 num_late_days,
                 last_modified}: CourseData) {
        this.pk = pk;
        this.name = name;
        this.semester = semester;
        this.year = year;
        this.subtitle = subtitle;
        this.num_late_days = num_late_days;
        this.last_modified = last_modified;
    }
}

export class Course extends CourseData implements SaveableAPIObject {
    static async create(data: NewCourseData) {
        let response = await HttpClient.get_instance().post<CourseData>(`/courses/`, data);
        return new Course(response.data);
    }

    static async get_all() {
        let response = await HttpClient.get_instance().get<CourseData[]>(`/courses/`);
        return response.data.map(course_data => new Course(course_data));
    }

    static async get_by_pk(pk: number) {
        let response = await HttpClient.get_instance().get<CourseData>(`/courses/${pk}/`);
        return new Course(response.data);
    }

    static async get_by_fields(name: string, semester: Semester, year: number) {
        let response = await HttpClient.get_instance().get<CourseData>(
            `/course/${name}/${semester}/${year}/`
        );
        return new Course(response.data);
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<CourseData>(
            `/courses/${this.pk}/`, filter_keys(this, Course.EDITABLE_FIELDS)
        );
        safe_assign(this, response.data);
    }

    static readonly EDITABLE_FIELDS: (keyof CourseData)[] = [
        'name',
        'semester',
        'year',
        'subtitle',
        'num_late_days',
    ];

    async refresh(): Promise<void> {
        let response = await HttpClient.get_instance().get<CourseData>(`/courses/${this.pk}/`);
        safe_assign(this, response.data);
    }
}

interface NewCourseData {
    name: string;
    semester?: Semester | null;
    year?: number | null;
    subtitle?: string;
    num_late_days?: number;
}

export enum Semester {
    fall = 'Fall',
    winter = 'Winter',
    spring = 'Spring',
    summer = 'Summer',
}
