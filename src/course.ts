import { SaveableAPIObject } from "src/base";
import { HttpClient } from "src/http_client";
import { User, UserData } from "src/user";
import { filter_keys, safe_assign } from "src/utils";

export class CourseData {
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

    async get_admins(): Promise<User[]> {
        let response = await HttpClient.get_instance().get<UserData[]>(
            `/courses/${this.pk}/admins/`);
        return response.data.map(user_data => new User(user_data));
    }

    add_admins(usernames: string[]) {
        return HttpClient.get_instance().post(
            `/courses/${this.pk}/admins/`, {'new_admins': usernames});
    }

    remove_admins(users: User[]) {
        return HttpClient.get_instance().patch(
            `/courses/${this.pk}/admins/`, {'remove_admins': users});
    }

    async get_staff(): Promise<User[]> {
        let response = await HttpClient.get_instance().get<UserData[]>(
            `/courses/${this.pk}/staff/`);
        return response.data.map(user_data => new User(user_data));
    }

    add_staff(usernames: string[]) {
        return HttpClient.get_instance().post(
            `/courses/${this.pk}/staff/`, {'new_staff': usernames});
    }

    remove_staff(users: User[]) {
        return HttpClient.get_instance().patch(
            `/courses/${this.pk}/staff/`, {'remove_staff': users});
    }

    async get_students(): Promise<User[]> {
        let response = await HttpClient.get_instance().get<UserData[]>(
            `/courses/${this.pk}/students/`);
        return response.data.map(user_data => new User(user_data));
    }

    add_students(usernames: string[]) {
        return HttpClient.get_instance().post(
            `/courses/${this.pk}/students/`, {'new_students': usernames});
    }

    remove_students(users: User[]) {
        return HttpClient.get_instance().patch(
            `/courses/${this.pk}/students/`, {'remove_students': users});
    }

    set_students(usernames: string[]) {
        return HttpClient.get_instance().put(
            `/courses/${this.pk}/students/`, {'new_students': usernames});
    }

    async get_handgraders(): Promise<User[]> {
        let response = await HttpClient.get_instance().get<UserData[]>(
            `/courses/${this.pk}/handgraders/`);
        return response.data.map(user_data => new User(user_data));
    }

    add_handgraders(usernames: string[]) {
        return HttpClient.get_instance().post(
            `/courses/${this.pk}/handgraders/`, {'new_handgraders': usernames});
    }

    remove_handgraders(users: User[]) {
        return HttpClient.get_instance().patch(
            `/courses/${this.pk}/handgraders/`, {'remove_handgraders': users});
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
