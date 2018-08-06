import { SaveableAPIObject, UnsavedAPIObject } from "./base";
import { HttpClient } from "./http_client";

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

    save(): Promise<void> {
        throw new Error();
    }

    refresh(): Promise<void> {
        throw new Error();
    }
}


class UnsavedCourseData {
    name: string;
    semester: Semester | null;
    year: number | null;
    subtitle: string;
    num_late_days: number;

    constructor({name = '',
                 semester = null,
                 year = null,
                 subtitle = '',
                 num_late_days = 0}: UnsavedCourseDataCtor) {
        this.name = name;
        this.semester = semester;
        this.year = year;
        this.subtitle = subtitle;
        this.num_late_days = num_late_days;
    }
}
interface UnsavedCourseDataCtor {
    name?: string;
    semester?: Semester | null;
    year?: number | null;
    subtitle?: string;
    num_late_days?: number;
}

export class UnsavedCourse extends UnsavedCourseData implements UnsavedAPIObject {
    create(): Promise<Course> {
        throw new Error();
    }
}

export enum Semester {
    fall = 'Fall',
    winter = 'Winter',
    spring = 'Spring',
    summer = 'Summer',
}
